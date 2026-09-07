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
const updateUserSuccessRate = new Rate('update_user_success');
const deactivateSuccessRate = new Rate('deactivate_success');
const activateSuccessRate = new Rate('activate_success');
const deleteUserSuccessRate = new Rate('delete_user_success');
const searchUsersSuccessRate = new Rate('search_users_success');
const getActiveCashiersSuccessRate = new Rate('get_active_cashiers_success');
const csrfSuccessRate = new Rate('csrf_success_rate');

const getUsersListDuration = new Trend('get_users_list_duration', true);
const createUserDuration = new Trend('create_user_duration', true);
const getProfileDuration = new Trend('get_profile_duration', true);
const updateUserDuration = new Trend('update_user_duration', true);
const deactivateDuration = new Trend('deactivate_duration', true);
const activateDuration = new Trend('activate_duration', true);
const deleteUserDuration = new Trend('delete_user_duration', true);
const searchUsersDuration = new Trend('search_users_duration', true);
const getActiveCashiersDuration = new Trend('get_active_cashiers_duration', true);
const csrfDuration = new Trend('csrf_duration', true);

const totalUsersCreated = new Counter('total_users_created');
const totalUsersUpdated = new Counter('total_users_updated');
const totalUsersDeactivated = new Counter('total_users_deactivated');
const totalUsersActivated = new Counter('total_users_activated');
const totalUsersDeleted = new Counter('total_users_deleted');

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
        'http_req_duration{type:csrf_handshake}': ['p(95)<300'],
        'http_req_failed{type:csrf_handshake}': ['rate<0.01'],
        'csrf_success_rate': ['rate>0.99'],
        'http_req_duration{type:backoffice_login}': ['p(95)<500'],
        'http_req_failed{type:backoffice_login}': ['rate<0.01'],
        'login_success_rate': ['rate>0.95'],
        'http_req_duration{type:get_users_list}': ['p(95)<300'],
        'http_req_failed{type:get_users_list}': ['rate<0.01'],
        'get_users_list_success': ['rate>0.95'],
        'http_req_duration{type:get_active_cashiers}': ['p(95)<300'],
        'http_req_failed{type:get_active_cashiers}': ['rate<0.01'],
        'get_active_cashiers_success': ['rate>0.95'],
        'http_req_duration{type:search_users}': ['p(95)<300'],
        'http_req_failed{type:search_users}': ['rate<0.01'],
        'search_users_success': ['rate>0.95'],
        'http_req_duration{type:create_user}': ['p(95)<500'],
        'http_req_failed{type:create_user}': ['rate<0.01'],
        'create_user_success': ['rate>0.95'],
        'http_req_duration{type:get_user_profile}': ['p(95)<200'],
        'http_req_failed{type:get_user_profile}': ['rate<0.01'],
        'get_profile_success': ['rate>0.95'],
        'http_req_duration{type:update_user}': ['p(95)<500'],
        'http_req_failed{type:update_user}': ['rate<0.01'],
        'update_user_success': ['rate>0.95'],
        'http_req_duration{type:deactivate_user}': ['p(95)<500'],
        'http_req_failed{type:deactivate_user}': ['rate<0.01'],
        'deactivate_success': ['rate>0.95'],
        'http_req_duration{type:activate_user}': ['p(95)<500'],
        'http_req_failed{type:activate_user}': ['rate<0.01'],
        'activate_success': ['rate>0.95'],
        'http_req_duration{type:delete_user}': ['p(95)<500'],
        'http_req_failed{type:delete_user}': ['rate<0.01'],
        'delete_user_success': ['rate>0.95'],
        'http_req_failed': ['rate<0.01'],
        'http_req_duration': ['p(95)<500'],
    },
};

// =========================================================================
// 3. ENVIRONMENT & TEST DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const users = new SharedArray('test managers', function () {
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: 20 }, (_, i) => ({
        username: `manager_test_${i + 1}`,
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
        // Silently ignore
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
    
    sleep(Math.random() * 2);
    
    // TEST 1: GET PAGINATED USERS
    group('Get Paginated List', function () {
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
            'Has pagination data': (r) => r.json('data') !== undefined && r.json('meta') !== undefined,
        });
    });
    
    sleep(Math.random() * 2);
    
    // TEST 2: GET ACTIVE CASHIERS
    group('Get Active Cashiers', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/pos/active-cashiers`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_active_cashiers' } }
        );
        
        getActiveCashiersDuration.add(Date.now() - startTime);
        
        const success = res.status === 200 && Array.isArray(res.json('data'));
        getActiveCashiersSuccessRate.add(success);
        
        check(res, {
            'Get active cashiers status is 200': (r) => r.status === 200,
            'Returns array': (r) => Array.isArray(r.json('data')),
        });
    });
    
    sleep(Math.random() * 2);
    
    // TEST 3: SEARCH USERS
    group('Search Users', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/users?search=cashier`,
            { headers: getHeaders, jar: jar, tags: { type: 'search_users' } }
        );
        
        searchUsersDuration.add(Date.now() - startTime);
        
        const success = res.status === 200;
        searchUsersSuccessRate.add(success);
    });
    
    sleep(Math.random() * 2);
    
    // TEST 4: CREATE USER
    let newUserId = null;
    
    group('Create New User', function () {
        const uniqueId = `${__VU}_${Date.now()}_${__ITER}`;
        const createPayload = JSON.stringify({
            name: `LoadTest ${uniqueId}`,
            username: `lt_${uniqueId}`,
            password: 'Password123!',
            pin_code: '123456',
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
        }
    });
    
    sleep(Math.random() * 2);
    
    if (newUserId) {
        // TEST 5: GET USER PROFILE
        group('Get Profile', function () {
            const startTime = Date.now();
            
            const res = http.get(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}`,
                { headers: getHeaders, jar: jar, tags: { type: 'get_user_profile' } }
            );
            
            getProfileDuration.add(Date.now() - startTime);
            
            const success = res.status === 200 && res.json('data.id') === newUserId;
            getProfileSuccessRate.add(success);
        });
        
        sleep(Math.random() * 2);
        
        // TEST 6: UPDATE USER
        group('Update User', function () {
            const updatePayload = JSON.stringify({
                name: `Updated ${newUserId}`,
                is_active: true,
            });
            
            const startTime = Date.now();
            
            const res = http.patch(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}`,
                updatePayload,
                { headers: mutationHeaders, jar: jar, tags: { type: 'update_user' } }
            );
            
            updateUserDuration.add(Date.now() - startTime);
            
            const success = res.status === 200;
            updateUserSuccessRate.add(success);
            
            if (success) totalUsersUpdated.add(1);
        });
        
        sleep(Math.random() * 2);
        
        // TEST 7: DEACTIVATE USER
        group('Deactivate User', function () {
            const startTime = Date.now();
            
            const res = http.patch(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}/deactivate`,
                null,
                { headers: mutationHeaders, jar: jar, tags: { type: 'deactivate_user' } }
            );
            
            deactivateDuration.add(Date.now() - startTime);
            
            const success = res.status === 200;
            deactivateSuccessRate.add(success);
            
            if (success) totalUsersDeactivated.add(1);
        });
        
        sleep(Math.random() * 2);
        
        // TEST 8: ACTIVATE USER
        group('Activate User', function () {
            const startTime = Date.now();
            
            const res = http.patch(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}/activate`,
                null,
                { headers: mutationHeaders, jar: jar, tags: { type: 'activate_user' } }
            );
            
            activateDuration.add(Date.now() - startTime);
            
            const success = res.status === 200;
            activateSuccessRate.add(success);
            
            if (success) totalUsersActivated.add(1);
        });
        
        sleep(Math.random() * 2);
        
        // TEST 9: DELETE USER
        group('Delete User', function () {
            const startTime = Date.now();
            
            const res = http.del(
                `${BASE_URL}/api-test/v1/backoffice/users/${newUserId}`,
                null,
                { headers: mutationHeaders, jar: jar, tags: { type: 'delete_user' } }
            );
            
            deleteUserDuration.add(Date.now() - startTime);
            
            const success = res.status === 204;
            deleteUserSuccessRate.add(success);
            
            if (success) totalUsersDeleted.add(1);
        });
    }
}

// =========================================================================
// 6. SETUP & TEARDOWN
// =========================================================================
export function setup() {
    console.log('=== User Module Load Test ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Users: ${users.length}`);
    console.log('============================');
    
    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`);
        console.log(`CSRF health: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect: ${e.message}`);
    }
    
    return { startTime: new Date().toISOString() };
}

export function teardown() {
    console.log('\n=== Summary ===');
    console.log(`Created: ${totalUsersCreated.count}`);
    console.log(`Updated: ${totalUsersUpdated.count}`);
    console.log(`Deactivated: ${totalUsersDeactivated.count}`);
    console.log(`Activated: ${totalUsersActivated.count}`);
    console.log(`Deleted: ${totalUsersDeleted.count}`);
    console.log('===============');
}