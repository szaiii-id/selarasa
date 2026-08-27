import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const loginSuccessRate = new Rate('login_success_rate');
const getShiftsListSuccessRate = new Rate('get_shifts_list_success');
const getActiveShiftsSuccessRate = new Rate('get_active_shifts_success');
const createShiftSuccessRate = new Rate('create_shift_success');
const updateShiftSuccessRate = new Rate('update_shift_success');
const deleteShiftSuccessRate = new Rate('delete_shift_success');
const csrfSuccessRate = new Rate('csrf_success_rate');

const getShiftsListDuration = new Trend('get_shifts_list_duration', true);
const getActiveShiftsDuration = new Trend('get_active_shifts_duration', true);
const createShiftDuration = new Trend('create_shift_duration', true);
const updateShiftDuration = new Trend('update_shift_duration', true);
const deleteShiftDuration = new Trend('delete_shift_duration', true);

const totalShiftsCreated = new Counter('total_shifts_created');
const totalShiftsUpdated = new Counter('total_shifts_updated');
const totalShiftsDeleted = new Counter('total_shifts_deleted');

// =========================================================================
// CONFIGURATION & THRESHOLDS
// =========================================================================
export const options = {
    scenarios: {
        shift_master_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '20s', target: 30 },
                { duration: '1m', target: 30 },
                { duration: '20s', target: 0 },
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:get_shifts_list}': ['p(95)<300'],
        'http_req_failed{type:get_shifts_list}': ['rate<0.01'],
        'get_shifts_list_success': ['rate>0.95'],
        'http_req_duration{type:get_active_shifts}': ['p(95)<300'],
        'get_active_shifts_success': ['rate>0.95'],
        'http_req_duration{type:create_shift}': ['p(95)<500'],
        'create_shift_success': ['rate>0.95'],
        'http_req_duration{type:update_shift}': ['p(95)<500'],
        'update_shift_success': ['rate>0.95'],
        'http_req_duration{type:delete_shift}': ['p(95)<500'],
        'delete_shift_success': ['rate>0.95'],
        'http_req_failed': ['rate<0.01'],
    },
};

// =========================================================================
// ENVIRONMENT & TEST DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const USER_COUNT = parseInt(__ENV.USER_COUNT) || 20;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const managers = new SharedArray('managers', function () {
    const count = parseInt(__ENV.USER_COUNT) || 20;
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: count }, (_, i) => ({
        username: `manager_test_${i + 1}`,
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
// MAIN TEST SCENARIO
// =========================================================================
export default function () {
    const manager = managers[(__VU - 1) % managers.length];
    const jar = http.cookieJar();
    
    // Login
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, manager);
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
    
    // TEST 1: GET ALL SHIFTS
    group('Shift Master: Get All Shifts', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/shifts`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_shifts_list' } }
        );
        
        getShiftsListDuration.add(Date.now() - startTime);
        
        const success = res.status === 200 && res.json('data') !== undefined;
        getShiftsListSuccessRate.add(success);
        
        check(res, {
            'Get shifts status is 200': (r) => r.status === 200,
            'Has data structure': (r) => r.json('data') !== undefined,
        });
        
        if (!success) logError('GET_SHIFTS', res, manager);
    });
    
    sleep(1);
    
    // TEST 2: GET ACTIVE SHIFTS
    group('Shift Master: Get Active Shifts', function () {
        const startTime = Date.now();
        
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/shifts/active`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_active_shifts' } }
        );
        
        getActiveShiftsDuration.add(Date.now() - startTime);
        
        const success = res.status === 200 && res.json('data') !== undefined;
        getActiveShiftsSuccessRate.add(success);
        
        check(res, {
            'Get active shifts status is 200': (r) => r.status === 200,
            'Has data structure': (r) => r.json('data') !== undefined,
        });
        
        if (!success) logError('GET_ACTIVE_SHIFTS', res, manager);
    });
    
    sleep(1);
    
    // TEST 3: CREATE SHIFT
    let newShiftId = null;
    
    group('Shift Master: Create Shift', function () {
        const uniqueId = `${__VU}_${Date.now()}_${__ITER}`;
        const createPayload = JSON.stringify({
            name: `Load Test Shift ${uniqueId}`,
            start_time: '10:00',
            end_time: '18:00',
            is_active: true,
        });
        
        const startTime = Date.now();
        
        const res = http.post(
            `${BASE_URL}/api-test/v1/backoffice/shifts`,
            createPayload,
            { headers: mutationHeaders, jar: jar, tags: { type: 'create_shift' } }
        );
        
        createShiftDuration.add(Date.now() - startTime);
        
        const success = res.status === 201;
        createShiftSuccessRate.add(success);
        
        check(res, {
            'Create shift status is 201': (r) => r.status === 201,
            'Created shift has ID': (r) => r.json('data.id') !== undefined,
        });
        
        if (success) {
            newShiftId = res.json('data.id');
            totalShiftsCreated.add(1);
        } else {
            logError('CREATE_SHIFT', res, manager);
        }
    });
    
    sleep(1);
    
    if (newShiftId) {
        // TEST 4: UPDATE SHIFT
        group('Shift Master: Update Shift', function () {
            const updatePayload = JSON.stringify({
                name: `Updated Shift ${Date.now()}`,
                start_time: '11:00',
                end_time: '19:00',
                is_active: true,
            });
            
            const startTime = Date.now();
            
            const res = http.put(
                `${BASE_URL}/api-test/v1/backoffice/shifts/${newShiftId}`,
                updatePayload,
                { headers: mutationHeaders, jar: jar, tags: { type: 'update_shift' } }
            );
            
            updateShiftDuration.add(Date.now() - startTime);
            
            const success = res.status === 200;
            updateShiftSuccessRate.add(success);
            
            check(res, {
                'Update shift status is 200': (r) => r.status === 200,
                'Success message received': (r) => r.json('message') === 'Shift schedule updated successfully.',
            });
            
            if (success) totalShiftsUpdated.add(1);
            else logError('UPDATE_SHIFT', res, manager);
        });
        
        sleep(1);
        
        // TEST 5: DELETE SHIFT
        group('Shift Master: Delete Shift', function () {
            const startTime = Date.now();
            
            const res = http.del(
                `${BASE_URL}/api-test/v1/backoffice/shifts/${newShiftId}`,
                null,
                { headers: getHeaders, jar: jar, tags: { type: 'delete_shift' } }
            );
            
            deleteShiftDuration.add(Date.now() - startTime);
            
            const success = res.status === 204;
            deleteShiftSuccessRate.add(success);
            
            check(res, {
                'Delete shift status is 204': (r) => r.status === 204,
            });
            
            if (success) totalShiftsDeleted.add(1);
            else logError('DELETE_SHIFT', res, manager);
        });
        
        sleep(1);
    }
}

export function setup() {
    console.log('=== Shift Master Load Test Setup ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total Managers: ${managers.length}`);
    console.log('====================================');
    
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
    console.log('\n=== Shift Master Load Test Summary ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('======================================');
}