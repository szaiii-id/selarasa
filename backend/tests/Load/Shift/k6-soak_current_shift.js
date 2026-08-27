import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const currentShiftSuccessRate = new Rate('current_shift_success_rate');
const csrfDuration = new Trend('csrf_duration', true);
const loginDuration = new Trend('login_duration', true);
const currentShiftDuration = new Trend('current_shift_duration', true);
const totalRequests = new Counter('total_current_shift_requests');

// =========================================================================
// CONFIGURATION - SOAK TEST (LONG DURATION)
// =========================================================================
export const options = {
    scenarios: {
        soak_current_shift: {
            executor: 'constant-vus',
            vus: 50,
            duration: '2h', // 2 hours soak test
            gracefulStop: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:current_shift}': ['p(95)<200'],
        'http_req_failed{type:current_shift}': ['rate<0.01'],
        'current_shift_success_rate': ['rate>0.98'],
        'http_req_duration{type:current_shift}': ['avg<150'],
    },
};

// =========================================================================
// ENVIRONMENT
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';
const USER_COUNT = parseInt(__ENV.USER_COUNT) || 30;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const users = new SharedArray('soak cashiers', function () {
    const count = parseInt(__ENV.USER_COUNT) || 30;
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: count }, (_, i) => ({
        username: `cashier_test_${i + 1}`,
        password: password,
    }));
});

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
function getXsrfToken(cookies) {
    if (!cookies || !cookies['XSRF-TOKEN']) return '';
    
    try {
        const xsrfCookie = cookies['XSRF-TOKEN'];
        if (Array.isArray(xsrfCookie) && xsrfCookie.length > 0) {
            return decodeURIComponent(xsrfCookie[0].value);
        } else if (typeof xsrfCookie === 'string') {
            return decodeURIComponent(xsrfCookie);
        }
    } catch (e) {
        return '';
    }
    
    return '';
}

function getBaseHeaders() {
    return {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': FRONTEND_URL,
        'Origin': FRONTEND_URL,
        'User-Agent': 'k6-soak-test',
    };
}

function performCsrfHandshake(jar) {
    const startTime = Date.now();
    
    let csrfRes;
    try {
        csrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
            jar: jar,
            tags: { type: 'csrf_handshake' },
        });
    } catch (e) {
        return { response: null, token: '', success: false };
    }
    
    csrfDuration.add(Date.now() - startTime);
    
    const xsrfToken = getXsrfToken(csrfRes.cookies);
    const success = (csrfRes.status === 200 || csrfRes.status === 204) && xsrfToken.length > 0;
    csrfSuccessRate.add(success);
    
    return { response: csrfRes, token: xsrfToken, success };
}

function performLogin(jar, csrfToken, user) {
    const loginPayload = JSON.stringify({
        username: user.username,
        password: user.password,
    });
    
    const startTime = Date.now();
    
    let loginRes;
    try {
        loginRes = http.post(
            `${BASE_URL}/api-test/v1/pos/auth/login`,
            loginPayload,
            {
                headers: {
                    ...getBaseHeaders(),
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrfToken,
                },
                jar: jar,
                tags: { type: 'pos_login' },
            }
        );
    } catch (e) {
        return { response: null, success: false };
    }
    
    loginDuration.add(Date.now() - startTime);
    
    const success = loginRes.status === 200;
    loginSuccessRate.add(success);
    
    return { response: loginRes, success };
}

// =========================================================================
// MAIN TEST SCENARIO - SOAK CURRENT SHIFT
// =========================================================================
export default function () {
    const user = users[(__VU - 1) % users.length];
    const jar = http.cookieJar();
    
    // Login once per VU
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, user);
    if (!loginResult.success) return;
    
    // Refresh CSRF after login
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const authHeaders = {
        ...getBaseHeaders(),
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    // Continuously check current shift (simulating POS app polling)
    while (true) {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/pos/shifts/current`,
            {
                headers: authHeaders,
                jar: jar,
                tags: { type: 'current_shift' },
            }
        );
        
        currentShiftDuration.add(Date.now() - startTime);
        totalRequests.add(1);
        
        const success = res.status === 200;
        currentShiftSuccessRate.add(success);
        
        check(res, {
            'Current shift status is 200': (r) => r.status === 200,
            'Has valid JSON response': (r) => {
                try {
                    const body = r.json();
                    return body.message !== undefined && body.data !== undefined;
                } catch (e) {
                    return false;
                }
            },
        });
        
        // Simulate POS polling interval (every 5-10 seconds)
        sleep(Math.random() * 5 + 5);
    }
}

// =========================================================================
// SETUP & TEARDOWN
// =========================================================================
export function setup() {
    console.log('=== Soak Test: Current Shift Endpoint ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Constant VUs: 50`);
    console.log(`Test Duration: 2 hours`);
    console.log('========================================');
}

export function teardown(data) {
    console.log('\n=== Soak Test Completed ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('===========================');
}