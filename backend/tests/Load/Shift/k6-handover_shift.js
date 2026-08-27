import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const loginSuccessRate = new Rate('login_success_rate');
const handoverSuccessRate = new Rate('handover_success_rate');
const handoverConflictRate = new Rate('handover_conflict_rate');
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginDuration = new Trend('login_duration', true);
const handoverDuration = new Trend('handover_duration', true);

const totalHandovers = new Counter('total_handovers');
const totalHandoverConflicts = new Counter('total_handover_conflicts');

// =========================================================================
// CONFIGURATION
// =========================================================================
export const options = {
    scenarios: {
        handover_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '15s', target: 20 },
                { duration: '45s', target: 20 },
                { duration: '15s', target: 0 },
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:handover_shift}': ['p(95)<500'],
    },
};

// =========================================================================
// ENVIRONMENT
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';
const USER_COUNT = parseInt(__ENV.USER_COUNT) || 20;
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

// =========================================================================
// TEST DATA - DEFINE CASHIERS ARRAY
// =========================================================================
const cashiers = new SharedArray('cashiers', function () {
    const count = parseInt(__ENV.USER_COUNT) || 20;
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: count }, (_, i) => ({
        // PERBAIKAN 1: Format ID wajib Deterministic UUID v4 agar cocok dengan Seeder
        id: `00000000-0000-4000-8000-${String(1000 + i + 1).padStart(12, '0')}`, 
        username: `cashier_test_${i + 1}`,
        password: password,
        pin_code: '123456',
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
        'User-Agent': 'k6-handover-test',
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
// MAIN TEST SCENARIO
// =========================================================================
export default function () {
    const fromUser = cashiers[(__VU - 1) % cashiers.length];
    const toUser = cashiers[((__VU - 1) + 1) % cashiers.length];
    const jar = http.cookieJar();
    
    // Login as fromUser
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, fromUser);
    if (!loginResult.success) return;
    
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    // Cek apakah fromUser sudah punya shift aktif
    const currentRes = http.get(
        `${BASE_URL}/api-test/v1/pos/shifts/current`,
        { headers: authHeaders, jar: jar, tags: { type: 'current_shift' } }
    );
    
    if (currentRes.status !== 200) {
        console.error(`[VU ${__VU}] Get current shift failed. Status: ${currentRes.status}`);
        return;
    }
    
    let shiftData = null;
    try {
        const jsonResponse = currentRes.json();
        // Cek format response
        if (jsonResponse.data && jsonResponse.data.id) {
            shiftData = jsonResponse.data;
        } else if (jsonResponse.data && jsonResponse.data.data && jsonResponse.data.data.id) {
            shiftData = jsonResponse.data.data;
        } else if (jsonResponse.id) {
            shiftData = jsonResponse;
        }
    } catch (e) {
        console.error(`[VU ${__VU}] Failed to parse current shift: ${e.message}`);
        return;
    }
    
    if (!shiftData) {
        console.warn(`[VU ${__VU}] No active shift for ${fromUser.username}. Starting one...`);
        
        // Start shift dulu
        const startPayload = JSON.stringify({
            shift_id: 1,
            opening_balance: 100000,
            pin_code: '123456',
        });
        
        const startRes = http.post(
            `${BASE_URL}/api-test/v1/pos/shifts/start`,
            startPayload,
            { headers: authHeaders, jar: jar, tags: { type: 'start_shift' } }
        );
        
        if (startRes.status !== 201) {
            console.error(`[VU ${__VU}] Start shift failed. Status: ${startRes.status}, Body: ${startRes.body.substring(0, 200)}`);
            return;
        }
        
        shiftData = startRes.json('data');
    }
    
    const shiftId = shiftData.id;
    
    // PERBAIKAN 2: Menggunakan UUID Kasir (toUser.id)
    const handoverPayload = JSON.stringify({
        to_user_id: toUser.id, 
        pin_code: '123456',
        to_user_pin: '123456',
        amount_counted: 100000,
        notes: 'Load test handover',
    });
    
    const startTime = Date.now();
    
    const res = http.post(
        `${BASE_URL}/api-test/v1/pos/shifts/${shiftId}/handover`,
        handoverPayload,
        { headers: authHeaders, jar: jar, tags: { type: 'handover_shift' } }
    );
    
    handoverDuration.add(Date.now() - startTime);
    
    const isSuccess = res.status === 200;
    const isConflict = res.status === 409 || res.status === 403;
    
    handoverSuccessRate.add(isSuccess);
    handoverConflictRate.add(isConflict);
    
    check(res, {
        'Handover status is 200 or 409/403': (r) => r.status === 200 || r.status === 409 || r.status === 403,
    });
    
    if (isSuccess) {
        totalHandovers.add(1);
        console.log(`[VU ${__VU}] ✅ Handover success for shift ${shiftId}`);
    } else if (isConflict) {
        totalHandoverConflicts.add(1);
        console.log(`[VU ${__VU}] ⚠️ Conflict: ${res.status}`);
    } else {
        console.error(`[VU ${__VU}] ❌ Handover failed. Status: ${res.status}, Body: ${res.body.substring(0, 300)}`);
    }
    
    sleep(Math.random() * 2 + 1);
}

export function setup() {
    console.log('=== Handover Shift Load Test ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total Cashiers: ${cashiers.length}`);
    console.log('================================');
    
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
    console.log('\n=== Handover Shift Load Test Summary ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('========================================');
}