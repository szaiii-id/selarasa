import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS - RACE CONDITION
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const raceConditionDetected = new Rate('race_condition_detected');
const stockIn201Rate = new Rate('stock_in_201_rate');
const stockOut201Rate = new Rate('stock_out_201_rate');
const insufficientStockRate = new Rate('insufficient_stock_rate');

const totalStockInSuccess = new Counter('total_stock_in_success');
const totalStockOutSuccess = new Counter('total_stock_out_success');
const totalInsufficientErrors = new Counter('total_insufficient_errors');

// =========================================================================
// CONFIGURATION
// =========================================================================
export const options = {
    scenarios: {
        // Skenario 1: Concurrent IN pada material yang sama
        race_condition_in: {
            executor: 'per-vu-iterations',
            vus: 20,
            iterations: 10,
            maxDuration: '2m',
            exec: 'raceConditionIn',
        },
        // Skenario 2: Concurrent OUT pada material dengan stock terbatas
        race_condition_out: {
            executor: 'per-vu-iterations',
            vus: 20,
            iterations: 10,
            maxDuration: '2m',
            exec: 'raceConditionOut',
            startTime: '30s', // Beri jeda agar IN selesai dulu
        },
    },
    thresholds: {
        // Harus 0% race condition (tidak boleh ada double-process)
        'race_condition_detected': ['rate==0'],
        'csrf_success_rate': ['rate>0.99'],
        'login_success_rate': ['rate>0.95'],
        // Toleransi untuk 422 insufficient stock (expected)
        'http_req_failed': ['rate<=0.5'],
    },
};

// =========================================================================
// ENVIRONMENT & DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';
const MATERIAL_ID = parseInt(__ENV.MATERIAL_ID) || 1;

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
        const c = cookies['XSRF-TOKEN'];
        if (Array.isArray(c) && c.length > 0) return decodeURIComponent(c[0].value);
        if (typeof c === 'string') return decodeURIComponent(c);
    } catch (e) {}
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
    let res;
    try {
        res = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
            jar: jar,
        });
    } catch (e) {
        return { token: '', success: false };
    }
    const token = getXsrfToken(res.cookies);
    const success = (res.status === 200 || res.status === 204) && token.length > 0;
    csrfSuccessRate.add(success);
    return { token, success };
}

function performLogin(jar, csrfToken, user) {
    const payload = JSON.stringify({ username: user.username, password: user.password });
    let res;
    try {
        res = http.post(`${BASE_URL}/api-test/v1/backoffice/auth/login`, payload, {
            headers: {
                ...getBaseHeaders(),
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': csrfToken,
            },
            jar: jar,
        });
    } catch (e) {
        return { success: false };
    }
    const success = res.status === 200;
    loginSuccessRate.add(success);
    return { success };
}

// =========================================================================
// RACE CONDITION: STOCK IN (Concurrent)
// =========================================================================
export function raceConditionIn() {
    const user = managers[(__VU - 1) % managers.length];
    const jar = http.cookieJar();

    const csrf = performCsrfHandshake(jar);
    if (!csrf.success) return;

    const login = performLogin(jar, csrf.token, user);
    if (!login.success) return;

    const refresh = performCsrfHandshake(jar);
    if (!refresh.success) return;

    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refresh.token,
    };

    // 5 concurrent IN requests untuk 1 material
    const payload = JSON.stringify({
        raw_material_id: MATERIAL_ID,
        movement_type: 'IN',
        quantity: 1,
        reason: 'K6 race condition IN test',
        reference_id: `RACE-IN-${__VU}-${__ITER}`,
    });

    const responses = http.batch([
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
    ]);

    let successCount = 0;
    responses.forEach(res => {
        if (res.status === 201) {
            stockIn201Rate.add(true);
            successCount++;
            totalStockInSuccess.add(1);
        }
    });

    // Semua harus sukses (IN selalu boleh)
    // Yang penting: balance_before/after konsisten
    check(successCount, {
        'All 5 concurrent IN should succeed': () => successCount === 5,
    });

    // Cek konsistensi balance (tidak boleh ada balance yang sama dari 2 response berbeda)
    const balances = responses
        .filter(r => r.status === 201)
        .map(r => r.json('data.balance_before'))
        .filter((v, i, a) => a.indexOf(v) === i); // unique

    if (balances.length !== successCount) {
        // Ada duplikat balance_before → kemungkinan race condition
        raceConditionDetected.add(true);
    } else {
        raceConditionDetected.add(false);
    }

    sleep(1);
}

// =========================================================================
// RACE CONDITION: STOCK OUT (Concurrent dengan stock terbatas)
// =========================================================================
export function raceConditionOut() {
    const user = managers[(__VU - 1) % managers.length];
    const jar = http.cookieJar();

    const csrf = performCsrfHandshake(jar);
    if (!csrf.success) return;

    const login = performLogin(jar, csrf.token, user);
    if (!login.success) return;

    const refresh = performCsrfHandshake(jar);
    if (!refresh.success) return;

    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refresh.token,
    };

    // 5 concurrent OUT requests untuk 1 material
    // Ambil quantity kecil (1) agar tidak semua gagal
    const payload = JSON.stringify({
        raw_material_id: MATERIAL_ID,
        movement_type: 'OUT',
        quantity: 1,
        reason: 'K6 race condition OUT test',
        reference_id: `RACE-OUT-${__VU}-${__ITER}`,
    });

    const responses = http.batch([
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
        ['POST', `${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, { headers: authHeaders, jar: jar }],
    ]);

    let successCount = 0;
    let insufficientCount = 0;

    responses.forEach(res => {
        if (res.status === 201) {
            stockOut201Rate.add(true);
            successCount++;
            totalStockOutSuccess.add(1);
        } else if (res.status === 422) {
            insufficientStockRate.add(true);
            insufficientCount++;
            totalInsufficientErrors.add(1);
        }
    });

    // Semua response harus 201 atau 422 (tidak boleh 500)
    // Balance tidak boleh negatif
    const hasNegativeBalance = responses.some(r => {
        if (r.status === 201) {
            const balanceAfter = parseFloat(r.json('data.balance_after'));
            return balanceAfter < 0;
        }
        return false;
    });

    if (hasNegativeBalance) {
        raceConditionDetected.add(true);
        console.error(`[VU ${__VU}] RACE CONDITION DETECTED: Negative balance after concurrent OUT!`);
    } else {
        raceConditionDetected.add(false);
    }

    check(hasNegativeBalance, {
        'No negative balance should occur': () => hasNegativeBalance === false,
    });

    sleep(1);
}

// =========================================================================
// SETUP & TEARDOWN
// =========================================================================
export function setup() {
    console.log('=== Stock Movement Race Condition Test ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Target Material ID: ${MATERIAL_ID}`);
    console.log('Testing concurrent IN and OUT movements...');
    console.log('==========================================');

    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { headers: getBaseHeaders() });
        console.log(`Initial CSRF check: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect: ${e.message}`);
    }

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Race Condition Test Summary ===');
    console.log(`Stock IN Success: ${totalStockInSuccess.count}`);
    console.log(`Stock OUT Success: ${totalStockOutSuccess.count}`);
    console.log(`Insufficient Stock Errors: ${totalInsufficientErrors.count}`);
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('===================================');
}