import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// 1. CUSTOM METRICS
// =========================================================================
const loginSuccessRate = new Rate('login_success_rate');
const logoutSuccessRate = new Rate('logout_success_rate');
const meSuccessRate = new Rate('me_success_rate');
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginDuration = new Trend('login_duration', true);
const logoutDuration = new Trend('logout_duration', true);
const meDuration = new Trend('me_duration', true);
const csrfDuration = new Trend('csrf_duration', true);
const totalUsersLoggedIn = new Counter('total_users_logged_in');

// =========================================================================
// 2. CONFIGURATION & THRESHOLDS (SLA)
// =========================================================================
export const options = {
    scenarios: {
        backoffice_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 100 }, // Ramp-up
                { duration: '2m', target: 100 },  // Stable Load
                { duration: '30s', target: 0 },   // Ramp-down
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        // CSRF Handshake thresholds - Accept both 200 and 204
        'http_req_duration{type:csrf_handshake}': ['p(95)<500'],
        'http_req_failed{type:csrf_handshake}': ['rate<0.01'],
        'csrf_success_rate': ['rate>0.95'],
        
        // Login thresholds
        'http_req_duration{type:backoffice_login}': ['p(95)<800'],
        'http_req_failed{type:backoffice_login}': ['rate<0.01'],
        'login_success_rate': ['rate>0.95'],
        
        // Me endpoint thresholds
        'http_req_duration{type:backoffice_me}': ['p(95)<500'],
        'http_req_failed{type:backoffice_me}': ['rate<0.01'],
        'me_success_rate': ['rate>0.95'],
        
        // Logout thresholds
        'http_req_duration{type:backoffice_logout}': ['p(95)<500'],
        'http_req_failed{type:backoffice_logout}': ['rate<0.01'],
        'logout_success_rate': ['rate>0.95'],
    },
};

// =========================================================================
// 3. ENVIRONMENT VARIABLES & TEST DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const USER_COUNT = parseInt(__ENV.USER_COUNT) || 30;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

// Data test users
const users = new SharedArray('backoffice users', function () {
    const count = parseInt(__ENV.USER_COUNT) || 30;
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: count }, (_, i) => ({
        username: `user_test_${i + 1}`,
        password: password,
    }));
});

// =========================================================================
// 4. HELPER FUNCTIONS
// =========================================================================
function getXsrfToken(cookies) {
    if (!cookies || !cookies['XSRF-TOKEN']) {
        return '';
    }
    
    try {
        const xsrfCookie = cookies['XSRF-TOKEN'];
        if (Array.isArray(xsrfCookie) && xsrfCookie.length > 0) {
            return decodeURIComponent(xsrfCookie[0].value);
        } else if (typeof xsrfCookie === 'string') {
            return decodeURIComponent(xsrfCookie);
        }
    } catch (e) {
        console.warn(`[VU ${__VU}] Failed to decode XSRF token: ${e.message}`);
    }
    
    return '';
}

function getBaseHeaders() {
    return {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': FRONTEND_URL,
        'Origin': FRONTEND_URL,
        'User-Agent': 'k6-load-test',
    };
}

function logError(phase, response, user) {
    let errorMsg = 'Unknown error';
    let status = 'N/A';
    let duration = 'N/A';
    
    if (response) {
        status = response.status;
        
        if (response.timings) {
            duration = response.timings.duration;
        }
        
        if (response.body) {
            errorMsg = response.body.substring(0, 200);
            
            try {
                const jsonBody = JSON.parse(response.body);
                if (jsonBody && jsonBody.message) {
                    errorMsg = `Message: ${jsonBody.message}`;
                }
            } catch (e) {
                if (typeof response.body === 'string') {
                    const titleMatch = response.body.match(/<title>(.*?)<\/title>/i);
                    if (titleMatch && titleMatch[1]) {
                        errorMsg = `HTML Page: ${titleMatch[1]}`;
                    }
                }
            }
        }
    }
    
    console.error(
        `[VU ${__VU}] ${phase} FAILED | User: ${user.username} | ` +
        `Status: ${status} | Duration: ${duration}ms | Error: ${errorMsg}`
    );
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
        console.error(`[VU ${__VU}] CSRF request failed: ${e.message}`);
        return {
            response: null,
            token: '',
            success: false,
        };
    }
    
    csrfDuration.add(Date.now() - startTime);
    
    const xsrfToken = getXsrfToken(csrfRes.cookies);
    // Laravel Sanctum returns 204 No Content for CSRF endpoint
    const success = (csrfRes.status === 200 || csrfRes.status === 204) && xsrfToken.length > 0;
    csrfSuccessRate.add(success);
    
    if (!success) {
        console.warn(`[VU ${__VU}] CSRF failed. Status: ${csrfRes.status}, Token length: ${xsrfToken.length}`);
    }
    
    return {
        response: csrfRes,
        token: xsrfToken,
        success: success,
    };
}

// =========================================================================
// 5. MAIN TEST SCENARIO
// =========================================================================
export default function () {
    const user = users[(__VU - 1) % users.length];
    const jar = http.cookieJar();
    
    group('Back Office Login Flow', function () {
        // ---------------------------------------------------------
        // FASE 1: SANCTUM CSRF HANDSHAKE
        // ---------------------------------------------------------
        const csrfResult = performCsrfHandshake(jar);
        
        check(csrfResult.response, {
            'CSRF handshake successful': (r) => r !== null && csrfResult.success,
            'CSRF token received': () => csrfResult.token.length > 0,
        });
        
        if (!csrfResult.success || !csrfResult.response) {
            logError('CSRF', csrfResult.response, user);
            return;
        }
        
        // ---------------------------------------------------------
        // FASE 2: AUTHENTICATION REQUEST (LOGIN)
        // ---------------------------------------------------------
        const loginPayload = JSON.stringify({
            username: user.username,
            password: user.password,
        });
        
        const loginStartTime = Date.now();
        
        let loginRes;
        try {
            loginRes = http.post(
                `${BASE_URL}/api-test/v1/backoffice/auth/login`,
                loginPayload,
                {
                    headers: {
                        ...getBaseHeaders(),
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': csrfResult.token,
                    },
                    jar: jar,
                    tags: { type: 'backoffice_login' },
                }
            );
        } catch (e) {
            console.error(`[VU ${__VU}] Login request failed: ${e.message}`);
            return;
        }
        
        loginDuration.add(Date.now() - loginStartTime);
        
        const loginSuccessful = loginRes.status === 200;
        loginSuccessRate.add(loginSuccessful);
        
        if (loginSuccessful) {
            totalUsersLoggedIn.add(1);
        }
        
        check(loginRes, {
            'Login status is 200': (r) => r.status === 200,
            'Has valid session cookie': (r) => {
                return r.cookies && Object.keys(r.cookies).some(
                    name => name.toLowerCase().includes('session') ||
                           name.toLowerCase().includes('sanctum') ||
                           name.toLowerCase().includes('laravel')
                );
            },
        });
        
        if (!loginSuccessful) {
            logError('LOGIN', loginRes, user);
            return;
        }
        
        // ---------------------------------------------------------
        // FASE 3: REFRESH CSRF TOKEN AFTER LOGIN
        // ---------------------------------------------------------
        const refreshResult = performCsrfHandshake(jar);
        
        if (!refreshResult.success) {
            logError('CSRF_REFRESH', refreshResult.response, user);
            return;
        }
        
        const authHeaders = {
            ...getBaseHeaders(),
            'X-XSRF-TOKEN': refreshResult.token,
        };
        
        // Think time simulation
        sleep(Math.random() * 1.5 + 1);
        
        // ---------------------------------------------------------
        // FASE 4: GET AUTHENTICATED USER (/me)
        // ---------------------------------------------------------
        const meStartTime = Date.now();
        
        let meRes;
        try {
            meRes = http.get(`${BASE_URL}/api-test/v1/auth/me`, {
                headers: authHeaders,
                jar: jar,
                tags: { type: 'backoffice_me' },
            });
        } catch (e) {
            console.error(`[VU ${__VU}] Me request failed: ${e.message}`);
            return;
        }
        
        meDuration.add(Date.now() - meStartTime);
        
        const meSuccessful = meRes.status === 200 && meRes.body && meRes.body.includes(user.username);
        meSuccessRate.add(meSuccessful);
        
        check(meRes, {
            'Me status is 200': (r) => r.status === 200,
            'Me returns correct username': (r) =>
                r.status === 200 && r.body && r.body.includes(user.username),
        });
        
        if (!meSuccessful) {
            logError('ME', meRes, user);
        }
        
        // Think time simulation
        sleep(Math.random() * 1.5 + 1);
        
        // ---------------------------------------------------------
        // FASE 5: LOGOUT
        // ---------------------------------------------------------
        const logoutStartTime = Date.now();
        
        let logoutRes;
        try {
            logoutRes = http.post(
                `${BASE_URL}/api-test/v1/auth/logout`,
                null,
                {
                    headers: authHeaders,
                    jar: jar,
                    tags: { type: 'backoffice_logout' },
                }
            );
        } catch (e) {
            console.error(`[VU ${__VU}] Logout request failed: ${e.message}`);
            return;
        }
        
        logoutDuration.add(Date.now() - logoutStartTime);
        
        const logoutSuccessful = logoutRes.status === 200;
        logoutSuccessRate.add(logoutSuccessful);
        
        check(logoutRes, {
            'Logout status is 200': (r) => r.status === 200,
        });
        
        if (!logoutSuccessful) {
            logError('LOGOUT', logoutRes, user);
        }
        
        // Think time simulation
        sleep(Math.random() * 1.5 + 1);
    });
}

// =========================================================================
// 6. SETUP & TEARDOWN FUNCTIONS
// =========================================================================
export function setup() {
    console.log('=== Back Office Load Test Setup ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Total Users: ${users.length}`);
    console.log(`Target VUs: 100`);
    console.log(`Test Duration: 3 minutes`);
    console.log('===================================');
    
    // Verify connectivity
    try {
        const healthCheck = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
        });
        console.log(`Initial CSRF check status: ${healthCheck.status}`);
        console.log(`CSRF cookies received: ${Object.keys(healthCheck.cookies || {}).join(', ')}`);
    } catch (e) {
        console.error(`Cannot connect to ${BASE_URL}: ${e.message}`);
        console.error('Make sure Laravel is running and BASE_URL is correct');
        console.error(`Current BASE_URL: ${BASE_URL}`);
    }
    
    return {
        startTime: new Date().toISOString(),
        config: {
            baseUrl: BASE_URL,
            frontendUrl: FRONTEND_URL,
            userCount: users.length,
        },
    };
}

export function teardown(data) {
    console.log('\n=== Back Office Load Test Summary ===');
    console.log(`Start Time: ${data.startTime}`);
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log(`Total Users: ${data.config.userCount}`);
    console.log('=====================================');
}