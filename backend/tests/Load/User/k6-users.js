import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// 1. CUSTOM METRICS
// =========================================================================
const loginSuccessRate = new Rate('login_success_rate');
const getUsersListSuccessRate = new Rate('get_users_list_success');
const createUserSuccessRate = new Rate('create_user_success');
const getProfileSuccessRate = new Rate('get_profile_success');
const deactivateSuccessRate = new Rate('deactivate_success');
const activateSuccessRate = new Rate('activate_success');
const csrfSuccessRate = new Rate('csrf_success_rate');

const getUsersListDuration = new Trend('get_users_list_duration', true);
const createUserDuration = new Trend('create_user_duration', true);
const getProfileDuration = new Trend('get_profile_duration', true);
const deactivateDuration = new Trend('deactivate_duration', true);
const activateDuration = new Trend('activate_duration', true);
const csrfDuration = new Trend('csrf_duration', true);

const totalUsersCreated = new Counter('total_users_created');
const totalUsersDeactivated = new Counter('total_users_deactivated');
const totalUsersActivated = new Counter('total_users_activated');

// =========================================================================
// 2. CONFIGURATION & THRESHOLDS
// =========================================================================
export const options = {
    scenarios: {
        user_module_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '20s', target: 50 },
                { duration: '1m', target: 50 },
                { duration: '20s', target: 0 },
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:get_users_list}': ['p(95)<300'],
        'http_req_failed{type:get_users_list}': ['rate<0.01'],
        'get_users_list_success': ['rate>0.95'],
        'http_req_duration{type:create_user}': ['p(95)<500'],
        'http_req_failed{type:create_user}': ['rate<0.01'],
        'create_user_success': ['rate>0.95'],
        'http_req_duration{type:get_user_profile}': ['p(95)<150'],
        'http_req_failed{type:get_user_profile}': ['rate<0.01'],
        'get_profile_success': ['rate>0.95'],
        'http_req_duration{type:deactivate_user}': ['p(95)<500'],
        'http_req_failed{type:deactivate_user}': ['rate<0.01'],
        'deactivate_success': ['rate>0.95'],
        'http_req_duration{type:activate_user}': ['p(95)<500'],
        'http_req_failed{type:activate_user}': ['rate<0.01'],
        'activate_success': ['rate>0.95'],
        'http_req_failed': ['rate<0.01'],
    },
};

// =========================================================================
// 3. ENVIRONMENT & TEST DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const USER_COUNT = parseInt(__ENV.USER_COUNT) || 30;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const users = new SharedArray('test admins', function () {
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
    if (!cookies || !cookies['XSRF-TOKEN']) return '';
    
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
    
    if (response) {
        status = response.status;
        
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
        `Status: ${status} | Error: ${errorMsg}`
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
    
    const success = loginRes.status === 200;
    loginSuccessRate.add(success);
    
    return { response: loginRes, success };
}

// =========================================================================
// 5. MAIN TEST SCENARIO
// =========================================================================
export default function () {
    const user = users[(__VU - 1) % users.length];
    const jar = http.cookieJar();
    
    // Login
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, user);
    if (!loginResult.success) return;
    
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const mutationHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    const getHeaders = {
        ...getBaseHeaders(),
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    sleep(1);
    
    // TEST 1: GET PAGINATED USERS
    group('User Module: Get Paginated List', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/users?per_page=15`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_users_list' } }
        );
        
        getUsersListDuration.add(Date.now() - startTime);
        
        const success = res.status === 200 && res.json('data') !== undefined;
        getUsersListSuccessRate.add(success);
        
        check(res, {
            'Get users status is 200': (r) => r.status === 200,
            'Has pagination data structure': (r) => r.json('data') !== undefined && r.json('meta') !== undefined,
        });
        
        if (!success) logError('GET_USERS_LIST', res, user);
    });
    
    sleep(1);
    
    // TEST 2: CREATE USER
    let newUserId = null;
    
    group('User Module: Create New User', function () {
        const uniqueId = `${__VU}_${Date.now()}_${__ITER}`;
        const createPayload = JSON.stringify({
            name: `LoadTest User ${uniqueId}`,
            username: `lt_user_${uniqueId}`,
            password: 'Password123!',
            role: 'cashier',
            is_active: true,
        });
        
        const startTime = Date.now();
        
        const res = http.post(
            `${BASE_URL}/api-test/v1/backoffice/users`,
            createPayload,
            { headers: mutationHeaders, jar: jar, tags: { type: 'create_user' } }
        );
        
        createUserDuration.add(Date.now() - startTime);
        
        const success = res.status === 201;
        createUserSuccessRate.add(success);
        
        check(res, {
            'Create user status is 201': (r) => r.status === 201,
            'Created user has ID': (r) => r.json('data.id') !== undefined,
        });
        
        if (success) {
            newUserId = res.json('data.id');
            totalUsersCreated.add(1);
        } else {
            logError('CREATE_USER', res, user);
        }
    });
    
    sleep(1);
    
    if (newUserId) {
        // TEST 3: GET USER PROFILE
        group('User Module: Get Profile', function () {
            const startTime = Date.now();
            
            const res = http.get(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}`,
                { headers: getHeaders, jar: jar, tags: { type: 'get_user_profile' } }
            );
            
            getProfileDuration.add(Date.now() - startTime);
            
            const success = res.status === 200 && res.json('data.id') === newUserId;
            getProfileSuccessRate.add(success);
            
            check(res, {
                'Get profile status is 200': (r) => r.status === 200,
                'Profile ID matches': (r) => r.json('data.id') === newUserId,
            });
            
            if (!success) logError('GET_PROFILE', res, user);
        });
        
        sleep(1);
        
        // TEST 4: DEACTIVATE USER
        group('User Module: Deactivate User', function () {
            const startTime = Date.now();
            
            const res = http.patch(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}/deactivate`,
                null,
                { headers: mutationHeaders, jar: jar, tags: { type: 'deactivate_user' } }
            );
            
            deactivateDuration.add(Date.now() - startTime);
            
            const success = res.status === 200;
            deactivateSuccessRate.add(success);
            
            check(res, {
                'Deactivate status is 200': (r) => r.status === 200,
                'Success message received': (r) => r.json('message') === 'User has been deactivated successfully.',
            });
            
            if (success) totalUsersDeactivated.add(1);
            else logError('DEACTIVATE_USER', res, user);
        });
        
        sleep(1);
        
        // TEST 5: ACTIVATE USER
        group('User Module: Activate User', function () {
            const startTime = Date.now();
            
            const res = http.patch(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}/activate`,
                null,
                { headers: mutationHeaders, jar: jar, tags: { type: 'activate_user' } }
            );
            
            activateDuration.add(Date.now() - startTime);
            
            const success = res.status === 200;
            activateSuccessRate.add(success);
            
            check(res, {
                'Activate status is 200': (r) => r.status === 200,
                'Success message received': (r) => r.json('message') === 'User has been activated successfully.',
            });
            
            if (success) totalUsersActivated.add(1);
            else logError('ACTIVATE_USER', res, user);
        });
        
        sleep(1);
    }
}

export function setup() {
    console.log('=== User Module Load Test Setup ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total Users: ${users.length}`);
    console.log('===================================');
    
    try {
        const healthCheck = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
        });
        console.log(`Initial CSRF check status: ${healthCheck.status}`);
    } catch (e) {
        console.error(`Cannot connect to ${BASE_URL}: ${e.message}`);
    }
    
    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== User Module Load Test Summary ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('=====================================');
}