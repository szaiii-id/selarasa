import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const startShift201Rate = new Rate('start_shift_201_rate');
const startShift409Rate = new Rate('start_shift_409_rate');
const closeShift200Rate = new Rate('close_shift_200_rate');
const closeShift404Rate = new Rate('close_shift_404_rate');
const raceConditionDetected = new Rate('race_condition_detected');

// =========================================================================
// CONFIGURATION - RACE CONDITION TEST
// =========================================================================
export const options = {
    scenarios: {
        race_condition_start: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 5,
            maxDuration: '2m',
            exec: 'raceConditionStart',
        },
        race_condition_close: {
            executor: 'per-vu-iterations',
            vus: 10,
            iterations: 5,
            maxDuration: '2m',
            exec: 'raceConditionClose',
            startTime: '15s', // Beri jeda agar start selesai duluan
        },
    },
    thresholds: {
        // Harus 0% (Tidak boleh ada data ganda yang tembus)
        'race_condition_detected': ['rate==0'], 
        // Abaikan peringatan gagal HTTP bawaan K6 karena kita MEMANG berharap dapat 409 & 404
        'http_req_failed': ['rate<=1.0'], 
    },
};

// =========================================================================
// ENVIRONMENT & DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

// Ambil ratusan data kasir agar setiap iterasi mendapat kasir yang belum punya shift
const cashiers = new SharedArray('cashiers', function () {
    const count = 100; // Cukup ambil 100 kasir pertama
    return Array.from({ length: count }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(1000 + i + 1).padStart(12, '0')}`,
        username: `cashier_test_${i + 1}`,
        password: PASSWORD,
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
        'User-Agent': 'k6-race-test',
    };
}

function performCsrfHandshake(jar) {
    let csrfRes;
    try {
        csrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
            jar: jar,
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
        loginRes = http.post(`${BASE_URL}/api-test/v1/pos/auth/login`, loginPayload, {
            headers: {
                ...getBaseHeaders(),
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': csrfToken,
            },
            jar: jar,
        });
    } catch (e) {
        return { response: null, success: false };
    }
    
    const success = loginRes.status === 200;
    loginSuccessRate.add(success);
    return { response: loginRes, success };
}

// =========================================================================
// RACE CONDITION: START SHIFT (Double-Click Scenario)
// =========================================================================
export function raceConditionStart() {
    const jar = http.cookieJar();
    
    // Trik agar tiap iterasi memakai kasir yang BERBEDA (Index 0 - 49)
    const userIndex = (__VU - 1) * 5 + __ITER; 
    const user = cashiers[userIndex];
    
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, user);
    if (!loginResult.success) return;
    
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    const shiftPayload = JSON.stringify({
        shift_id: 1,
        opening_balance: 100000,
        pin_code: user.pin_code,
        notes: 'Race condition START test',
    });
    
    // Send concurrent start requests (simulating brutal double/triple-click)
    const responses = http.batch([
        ['POST', `${BASE_URL}/api-test/v1/pos/shifts/start`, shiftPayload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/pos/shifts/start`, shiftPayload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/pos/shifts/start`, shiftPayload, { headers: authHeaders, jar: jar }],
    ]);
    
    let successCount = 0;
    let conflictCount = 0;
    
    responses.forEach(res => {
        if (res.status === 201) {
            startShift201Rate.add(true);
            successCount++;
        } else if (res.status === 409) {
            startShift409Rate.add(true);
            conflictCount++;
        }
    });
    
    if (successCount > 1) {
        raceConditionDetected.add(true);
    } else {
        raceConditionDetected.add(false);
    }
    
    check(successCount, {
        'Hanya 1 shift start yang boleh sukses (201)': () => successCount === 1,
        'Sisanya terdeteksi sebagai conflict (409)': () => conflictCount === 2,
    });
    
    sleep(1);
}

// =========================================================================
// RACE CONDITION: CLOSE SHIFT (Double-Click Scenario)
// =========================================================================
export function raceConditionClose() {
    const jar = http.cookieJar();
    
    // Trik agar memakai kasir yang BERBEDA (Index 50 - 99) menghindari bentrok dgn Start Test
    const userIndex = 50 + (__VU - 1) * 5 + __ITER; 
    const user = cashiers[userIndex];
    
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, user);
    if (!loginResult.success) return;
    
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    // First, start a shift legitimately
    const startPayload = JSON.stringify({
        shift_id: 1,
        opening_balance: 100000,
        pin_code: user.pin_code,
    });
    
    const startRes = http.post(
        `${BASE_URL}/api-test/v1/pos/shifts/start`,
        startPayload,
        { headers: authHeaders, jar: jar }
    );
    
    if (startRes.status !== 201) return;
    
    const shiftId = startRes.json('data.id');
    
    const closePayload = JSON.stringify({
        closing_balance: 100000,
        expected_balance: 100000,
        pin_code: user.pin_code,
    });
    
    // Send concurrent close requests (simulating brutal double/triple-click)
    const responses = http.batch([
        ['POST', `${BASE_URL}/api-test/v1/pos/shifts/${shiftId}/close`, closePayload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/pos/shifts/${shiftId}/close`, closePayload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/pos/shifts/${shiftId}/close`, closePayload, { headers: authHeaders, jar: jar }],
    ]);
    
    let successCount = 0;
    let notFoundCount = 0;
    
    responses.forEach(res => {
        if (res.status === 200) {
            closeShift200Rate.add(true);
            successCount++;
        } else if (res.status === 404 || res.status === 409) {
            closeShift404Rate.add(true);
            notFoundCount++;
        }
    });
    
    if (successCount > 1) {
        raceConditionDetected.add(true);
    } else {
        raceConditionDetected.add(false);
    }
    
    check(successCount, {
        'Hanya 1 shift close yang boleh sukses (200)': () => successCount === 1,
        'Sisanya terdeteksi sebagai not found (404)': () => notFoundCount === 2,
    });
    
    sleep(1);
}

// =========================================================================
// SETUP & TEARDOWN
// =========================================================================
export function setup() {
    console.log('=== Race Condition Test ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Testing brutal concurrent double-click scenarios...`);
    console.log('============================');
}

export function teardown(data) {
    console.log('\n=== Race Condition Test Completed ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('====================================');
}