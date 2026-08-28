import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const loginSuccessRate = new Rate('login_success_rate');
const forceCloseSuccessRate = new Rate('force_close_success_rate');
const forceCloseConflictRate = new Rate('force_close_conflict_rate');
const getOpenShiftsSuccessRate = new Rate('get_open_shifts_success_rate');
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginDuration = new Trend('login_duration', true);
const forceCloseDuration = new Trend('force_close_duration', true);
const getOpenShiftsDuration = new Trend('get_open_shifts_duration', true);

const totalForceCloses = new Counter('total_force_closes');
const totalForceCloseConflicts = new Counter('total_force_close_conflicts');
const totalOpenShiftsFound = new Counter('total_open_shifts_found');

// =========================================================================
// CONFIGURATION - Adjust thresholds for realistic expectations
// =========================================================================
export const options = {
    scenarios: {
        force_close_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '15s', target: 10 },  // Reduced VUs to avoid too many conflicts
                { duration: '45s', target: 10 },  // Maintain 10 VUs
                { duration: '15s', target: 0 },   // Ramp-down
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:force_close}': ['p(95)<500'],
        // Don't set http_req_failed for force_close because 409 is expected
        // 'http_req_failed{type:force_close}': ['rate<0.05'], // REMOVED
        'force_close_success_rate': ['rate>0.30'], // Lower threshold - conflicts are expected
        'force_close_conflict_rate': ['rate<0.70'], // Allow up to 70% conflicts
    },
};

// =========================================================================
// ENVIRONMENT
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const MANAGER_COUNT = parseInt(__ENV.MANAGER_COUNT) || 10;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const managers = new SharedArray('managers', function () {
    const count = parseInt(__ENV.MANAGER_COUNT) || 10;
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
        'User-Agent': 'k6-force-close-test',
    };
}

function performCsrfHandshake(jar) {
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
// MAIN TEST SCENARIO - Using mutex-like approach to avoid conflicts
// =========================================================================
export default function () {
    const manager = managers[(__VU - 1) % managers.length];
    const jar = http.cookieJar();
    
    // Login
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) {
        console.error(`[VU ${__VU}] CSRF failed for ${manager.username}`);
        return;
    }
    
    const loginResult = performLogin(jar, csrfResult.token, manager);
    if (!loginResult.success) {
        console.error(`[VU ${__VU}] Login failed for ${manager.username}: ${loginResult.response ? loginResult.response.status : 'N/A'}`);
        return;
    }
    
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) {
        console.error(`[VU ${__VU}] CSRF refresh failed for ${manager.username}`);
        return;
    }
    
    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    // Get open shifts - use larger per_page to get more options
    const listStartTime = Date.now();
    
    const listRes = http.get(
        `${BASE_URL}/api-test/v1/backoffice/cashier-shifts?status=open&per_page=20`,
        { headers: authHeaders, jar: jar, tags: { type: 'get_open_shifts' } }
    );
    
    getOpenShiftsDuration.add(Date.now() - listStartTime);
    
    if (listRes.status !== 200) {
        console.error(`[VU ${__VU}] Get open shifts failed. Status: ${listRes.status}`);
        return;
    }
    
    let openShifts = [];
    try {
        const jsonResponse = listRes.json();
        if (jsonResponse && jsonResponse.data && Array.isArray(jsonResponse.data)) {
            openShifts = jsonResponse.data;
        } else if (jsonResponse && jsonResponse.data && jsonResponse.data.data) {
            openShifts = jsonResponse.data.data;
        }
    } catch (e) {
        console.error(`[VU ${__VU}] Failed to parse JSON: ${e.message}`);
        return;
    }
    
    getOpenShiftsSuccessRate.add(openShifts.length > 0);
    
    if (openShifts.length === 0) {
        console.warn(`[VU ${__VU}] No open shifts found. Skipping force close.`);
        return;
    }
    
    totalOpenShiftsFound.add(openShifts.length);
    
    // Use VU-specific offset to avoid all VUs trying the same shifts
    const offset = (__VU - 1) % openShifts.length;
    const shiftsToProcess = openShifts.slice(offset, offset + 1); // Each VU processes only 1 shift
    
    shiftsToProcess.forEach(shift => {
        const shiftId = shift.id || shift.shift_id;
        const openingBalance = shift.opening_balance || 100000;
        
        const forceClosePayload = JSON.stringify({
            expected_balance: openingBalance,
            closing_balance: openingBalance,
            notes: `Force close by ${manager.username}`,
        });
        
        const startTime = Date.now();
        
        const res = http.post(
            `${BASE_URL}/api-test/v1/backoffice/cashier-shifts/${shiftId}/force-close`,
            forceClosePayload,
            { headers: authHeaders, jar: jar, tags: { type: 'force_close' } }
        );
        
        forceCloseDuration.add(Date.now() - startTime);
        
        const isSuccess = res.status === 200;
        const isConflict = res.status === 409;
        
        forceCloseSuccessRate.add(isSuccess);
        forceCloseConflictRate.add(isConflict);
        
        check(res, {
            'Force close status is 200 or 409': (r) => r.status === 200 || r.status === 409,
        });
        
        if (isSuccess) {
            totalForceCloses.add(1);
            console.log(`[VU ${__VU}] ✅ Force closed shift ${shiftId}`);
        } else if (isConflict) {
            totalForceCloseConflicts.add(1);
            console.log(`[VU ${__VU}] ⚠️ Conflict on shift ${shiftId} (already closed by another VU)`);
        } else {
            console.error(`[VU ${__VU}] ❌ Force close failed for shift ${shiftId}. Status: ${res.status}`);
        }
        
        // Longer sleep after force close
        sleep(2);
    });
    
    sleep(Math.random() * 3 + 2);
}

export function setup() {
    console.log('=== Force Close Shift Test ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total Managers: ${managers.length}`);
    console.log(`Strategy: Each VU processes unique shift to minimize conflicts`);
    console.log('====================================');
    
    try {
        const healthCheck = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
        });
        console.log(`Initial CSRF check status: ${healthCheck.status}`);
    } catch (e) {
        console.error(`Cannot connect to ${BASE_URL}: ${e.message}`);
    }
    
    // Check open shifts count
    const jar = http.cookieJar();
    const csrfResult = performCsrfHandshake(jar);
    if (csrfResult.success) {
        const testManager = managers[0];
        const loginResult = performLogin(jar, csrfResult.token, testManager);
        
        if (loginResult.success) {
            console.log('✅ Test login successful!');
            
            const refreshResult = performCsrfHandshake(jar);
            if (refreshResult.success) {
                const authHeaders = {
                    ...getBaseHeaders(),
                    'X-XSRF-TOKEN': refreshResult.token,
                };
                
                const listRes = http.get(
                    `${BASE_URL}/api-test/v1/backoffice/cashier-shifts?status=open&per_page=5`,
                    { headers: authHeaders, jar: jar }
                );
                
                console.log(`Open shifts endpoint status: ${listRes.status}`);
                
                try {
                    const jsonResponse = listRes.json();
                    const openShifts = jsonResponse.data.data || jsonResponse.data || [];
                    console.log(`Available open shifts: ${openShifts.length}`);
                } catch (e) {
                    console.log(`Response body: ${listRes.body.substring(0, 300)}`);
                }
            }
        } else {
            console.error('❌ Test login failed! Check credentials.');
        }
    }
    
    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Force Close Shift Test Summary ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log(`Total Successful Force Closes: ${totalForceCloses.value || 0}`);
    console.log(`Total Conflicts: ${totalForceCloseConflicts.value || 0}`);
    console.log(`Total Open Shifts Found: ${totalOpenShiftsFound.value || 0}`);
    console.log('=====================================');
}