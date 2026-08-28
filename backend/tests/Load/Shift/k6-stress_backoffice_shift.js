import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const historySuccessRate = new Rate('history_success_rate');
const filterSuccessRate = new Rate('filter_success_rate');
const forceCloseSuccessRate = new Rate('force_close_success_rate');
const csrfDuration = new Trend('csrf_duration', true);
const loginDuration = new Trend('login_duration', true);
const historyDuration = new Trend('history_duration', true);
const filterDuration = new Trend('filter_duration', true);
const forceCloseDuration = new Trend('force_close_duration', true);
const totalHistoryRequests = new Counter('total_history_requests');
const totalFilterRequests = new Counter('total_filter_requests');
const totalForceCloseRequests = new Counter('total_force_close_requests');

// =========================================================================
// CONFIGURATION - STRESS TEST
// =========================================================================
export const options = {
    scenarios: {
        stress_backoffice_history: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 50 },    // Ramp-up
                { duration: '2m', target: 100 },   // Increase
                { duration: '2m', target: 150 },   // Further increase
                { duration: '1m', target: 200 },   // Peak stress
                { duration: '30s', target: 0 },    // Ramp-down
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:history}': ['p(95)<1000'],
        'http_req_duration{type:filter}': ['p(95)<1000'],
        'http_req_duration{type:force_close}': ['p(95)<500'], 
        'http_req_failed{type:history}': ['rate<0.02'],
        'http_req_failed{type:filter}': ['rate<0.02'],
        'history_success_rate': ['rate>0.95'],
        'filter_success_rate': ['rate>0.95'],
    },
};

// =========================================================================
// ENVIRONMENT
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const MANAGER_COUNT = parseInt(__ENV.MANAGER_COUNT) || 20;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const managers = new SharedArray('managers', function () {
    const count = parseInt(__ENV.MANAGER_COUNT) || 20;
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: count }, (_, i) => ({
        username: `manager_test_${i + 1}`,
        password: password,
    }));
});

// Filter configurations for stress testing
const filterConfigs = [
    '?status=open',
    '?status=closed',
    '?date=' + new Date().toISOString().split('T')[0],
    '?per_page=50',
    '?per_page=100',
    '?date_from=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + '&date_to=' + new Date().toISOString().split('T')[0],
    '?status=closed&per_page=50',
    '?status=open&per_page=10',
];

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
        'User-Agent': 'k6-stress-test',
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
            `${BASE_URL}/api-test/v1/backoffice/auth/login`,
            loginPayload,
            {
                headers: {
                    ...getBaseHeaders(),
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrfToken,
                },
                jar: jar,
                tags: { type: 'backoffice_login' },
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
// MAIN TEST SCENARIO - STRESS BACKOFFICE HISTORY
// =========================================================================
export default function () {
    const manager = managers[(__VU - 1) % managers.length];
    const jar = http.cookieJar();
    
    // Login flow
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, manager);
    if (!loginResult.success) return;
    
    // Refresh CSRF
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const authHeaders = {
        ...getBaseHeaders(),
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    const mutationHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    // Test 1: Get paginated history (no filter)
    group('BackOffice: Get Paginated History', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/cashier-shifts?per_page=15`,
            {
                headers: authHeaders,
                jar: jar,
                tags: { type: 'history' },
            }
        );
        
        historyDuration.add(Date.now() - startTime);
        totalHistoryRequests.add(1);
        
        const success = res.status === 200;
        historySuccessRate.add(success);
        
        check(res, {
            'History status is 200': (r) => r.status === 200,
            'Has pagination': (r) => {
                try {
                    return r.json('data') !== undefined && r.json('meta') !== undefined;
                } catch (e) {
                    return false;
                }
            },
        });
        
        sleep(Math.random() * 1 + 0.5);
    });
    
    // Test 2: Apply various filters
    group('BackOffice: Filter History', function () {
        const filterConfig = filterConfigs[Math.floor(Math.random() * filterConfigs.length)];
        
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/cashier-shifts${filterConfig}`,
            {
                headers: authHeaders,
                jar: jar,
                tags: { type: 'filter' },
            }
        );
        
        filterDuration.add(Date.now() - startTime);
        totalFilterRequests.add(1);
        
        const success = res.status === 200;
        filterSuccessRate.add(success);
        
        check(res, {
            'Filter status is 200': (r) => r.status === 200,
            'Filter returns data': (r) => {
                try {
                    return r.json('data') !== undefined;
                } catch (e) {
                    return false;
                }
            },
        });
        
        sleep(Math.random() * 1 + 0.5);
    });
    
    // Test 3: Get open shifts and try force close
    group('BackOffice: Force Close Open Shifts', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/cashier-shifts?status=open&per_page=5`,
            {
                headers: authHeaders,
                jar: jar,
                tags: { type: 'history' },
            }
        );
        
        historyDuration.add(Date.now() - startTime);
        
        if (res.status === 200 && res.json('data') && res.json('data').length > 0) {
            const openShifts = res.json('data');
            
            openShifts.forEach(shift => {
                const forceClosePayload = JSON.stringify({
                    expected_balance: shift.opening_balance || 100000,
                    closing_balance: shift.opening_balance || 100000,
                    notes: `Force close by ${manager.username}`,
                });
                
                const fcStartTime = Date.now();
                
                const fcRes = http.post(
                    `${BASE_URL}/api-test/v1/backoffice/cashier-shifts/${shift.id}/force-close`,
                    forceClosePayload,
                    { headers: mutationHeaders, jar: jar, tags: { type: 'force_close' } }
                );
                
                forceCloseDuration.add(Date.now() - fcStartTime);
                totalForceCloseRequests.add(1);
                
                const isSuccess = fcRes.status === 200;
                forceCloseSuccessRate.add(isSuccess);
                
                check(fcRes, {
                    'Force close status is 200': (r) => r.status === 200,
                });
                
                sleep(0.5);
            });
        }
        
        sleep(Math.random() * 2 + 1);
    });
    
    // Test 4: Large page size stress
    group('BackOffice: Large Page Size', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/cashier-shifts?per_page=100`,
            {
                headers: authHeaders,
                jar: jar,
                tags: { type: 'history' },
            }
        );
        
        historyDuration.add(Date.now() - startTime);
        totalHistoryRequests.add(1);
        
        const success = res.status === 200;
        historySuccessRate.add(success);
        
        check(res, {
            'Large page size status is 200': (r) => r.status === 200,
        });
        
        sleep(Math.random() * 2 + 1);
    });
}

// =========================================================================
// SETUP & TEARDOWN
// =========================================================================
export function setup() {
    console.log('=== Stress Test: BackOffice Shift History ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Target VUs: 200 (peak)`);
    console.log(`Test Duration: ~6.5 minutes`);
    console.log('============================================');
    
    // Verify connectivity
    try {
        const healthCheck = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
        });
        console.log(`Initial CSRF check status: ${healthCheck.status}`);
    } catch (e) {
        console.error(`Cannot connect to ${BASE_URL}: ${e.message}`);
    }
}

export function teardown(data) {
    console.log('\n=== Stress Test Completed ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('============================');
}