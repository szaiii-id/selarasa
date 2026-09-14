import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const getMovementsListSuccessRate = new Rate('get_movements_list_success');
const stockInSuccessRate = new Rate('stock_in_success');
const stockOutSuccessRate = new Rate('stock_out_success');
const adjustmentSuccessRate = new Rate('adjustment_success');
const filterMovementsSuccessRate = new Rate('filter_movements_success');

const getMovementsListDuration = new Trend('get_movements_list_duration', true);
const stockInDuration = new Trend('stock_in_duration', true);
const stockOutDuration = new Trend('stock_out_duration', true);
const adjustmentDuration = new Trend('adjustment_duration', true);
const filterMovementsDuration = new Trend('filter_movements_duration', true);

const totalStockIn = new Counter('total_stock_in');
const totalStockOut = new Counter('total_stock_out');
const totalAdjustments = new Counter('total_adjustments');
const insufficientStockErrors = new Counter('insufficient_stock_errors');

// =========================================================================
// CONFIGURATION & THRESHOLDS
// =========================================================================
export const options = {
    scenarios: {
        stock_movements_load_test: {
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
        'http_req_duration{type:csrf_handshake}': ['p(95)<300'],
        'csrf_success_rate': ['rate>0.99'],
        'login_success_rate': ['rate>0.95'],

        'http_req_duration{type:get_movements_list}': ['p(95)<400'],
        'get_movements_list_success': ['rate>0.95'],

        'http_req_duration{type:filter_movements}': ['p(95)<400'],
        'filter_movements_success': ['rate>0.95'],

        'http_req_duration{type:stock_in}': ['p(95)<600'],
        'stock_in_success': ['rate>0.95'],

        'http_req_duration{type:stock_out}': ['p(95)<600'],
        'stock_out_success': ['rate>0.95'],

        'http_req_duration{type:adjustment}': ['p(95)<600'],
        'adjustment_success': ['rate>0.95'],

        'http_req_failed': ['rate<0.05'], // Sedikit toleransi untuk insufficient stock
    },
};

// =========================================================================
// ENVIRONMENT & TEST DATA
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
                const j = JSON.parse(response.body);
                if (j && j.message) errorMsg = `Message: ${j.message}`;
            } catch (e) {}
        }
    }
    console.error(`[VU ${__VU}] ${phase} FAILED | User: ${user.username} | Status: ${status} | Error: ${errorMsg}`);
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
    const token = getXsrfToken(csrfRes.cookies);
    const success = (csrfRes.status === 200 || csrfRes.status === 204) && token.length > 0;
    csrfSuccessRate.add(success);
    return { response: csrfRes, token, success };
}

function performLogin(jar, csrfToken, user) {
    const payload = JSON.stringify({ username: user.username, password: user.password });
    let loginRes;
    try {
        loginRes = http.post(`${BASE_URL}/api-test/v1/backoffice/auth/login`, payload, {
            headers: {
                ...getBaseHeaders(),
                'Content-Type': 'application/json',
                'X-XSRF-TOKEN': csrfToken,
            },
            jar: jar,
            tags: { type: 'backoffice_login' },
        });
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
    const user = managers[(__VU - 1) % managers.length];
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

    sleep(1);

    // TEST 1: GET PAGINATED MOVEMENTS
    group('Movements: Get Paginated', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/movements?per_page=15`, {
            headers: getHeaders, jar: jar, tags: { type: 'get_movements_list' },
        });
        getMovementsListDuration.add(Date.now() - start);

        const success = res.status === 200 && res.json('data') !== undefined;
        getMovementsListSuccessRate.add(success);

        check(res, {
            'Get movements status is 200': (r) => r.status === 200,
            'Has pagination data': (r) => r.json('data') !== undefined && r.json('meta') !== undefined,
        });

        if (!success) logError('GET_MOVEMENTS', res, user);
    });

    sleep(1);

    // TEST 2: FILTER MOVEMENTS BY MATERIAL
    group('Movements: Filter by Material', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/movements?raw_material_id=${MATERIAL_ID}`, {
            headers: getHeaders, jar: jar, tags: { type: 'filter_movements' },
        });
        filterMovementsDuration.add(Date.now() - start);

        const success = res.status === 200;
        filterMovementsSuccessRate.add(success);

        check(res, {
            'Filter movements status is 200': (r) => r.status === 200,
        });

        if (!success) logError('FILTER_MOVEMENTS', res, user);
    });

    sleep(1);

    // TEST 3: STOCK IN
    group('Movements: Stock IN', function () {
        const uniqueRef = `IN-${__VU}-${Date.now()}-${__ITER}`;
        const payload = JSON.stringify({
            raw_material_id: MATERIAL_ID,
            movement_type: 'IN',
            quantity: 10,
            reason: 'K6 load test stock IN',
            reference_id: uniqueRef,
        });

        const start = Date.now();
        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, {
            headers: mutationHeaders, jar: jar, tags: { type: 'stock_in' },
        });
        stockInDuration.add(Date.now() - start);

        const success = res.status === 201;
        stockInSuccessRate.add(success);

        check(res, {
            'Stock IN status is 201': (r) => r.status === 201,
            'Has balance_before': (r) => r.json('data.balance_before') !== undefined,
            'Has balance_after': (r) => r.json('data.balance_after') !== undefined,
        });

        if (success) totalStockIn.add(1);
        else logError('STOCK_IN', res, user);
    });

    sleep(1);

    // TEST 4: STOCK OUT
    group('Movements: Stock OUT', function () {
        const uniqueRef = `OUT-${__VU}-${Date.now()}-${__ITER}`;
        const payload = JSON.stringify({
            raw_material_id: MATERIAL_ID,
            movement_type: 'OUT',
            quantity: 5,
            reason: 'K6 load test stock OUT',
            reference_id: uniqueRef,
        });

        const start = Date.now();
        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, {
            headers: mutationHeaders, jar: jar, tags: { type: 'stock_out' },
        });
        stockOutDuration.add(Date.now() - start);

        const success = res.status === 201;
        stockOutSuccessRate.add(success);

        check(res, {
            'Stock OUT status is 201 OR 422 (insufficient)': (r) => r.status === 201 || r.status === 422,
        });

        if (res.status === 201) {
            totalStockOut.add(1);
        } else if (res.status === 422) {
            insufficientStockErrors.add(1);
        }
    });

    sleep(1);

    // TEST 5: ADJUSTMENT (positive)
    group('Movements: Adjustment', function () {
        const uniqueRef = `ADJ-${__VU}-${Date.now()}-${__ITER}`;
        const payload = JSON.stringify({
            raw_material_id: MATERIAL_ID,
            movement_type: 'ADJUSTMENT',
            quantity: 3,
            reason: 'K6 load test adjustment',
            reference_id: uniqueRef,
        });

        const start = Date.now();
        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, {
            headers: mutationHeaders, jar: jar, tags: { type: 'adjustment' },
        });
        adjustmentDuration.add(Date.now() - start);

        const success = res.status === 201;
        adjustmentSuccessRate.add(success);

        check(res, {
            'Adjustment status is 201': (r) => r.status === 201,
        });

        if (success) totalAdjustments.add(1);
        else logError('ADJUSTMENT', res, user);
    });
}

export function setup() {
    console.log('=== Stock Movements Load Test Setup ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Target Material ID: ${MATERIAL_ID}`);
    console.log('======================================');

    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { headers: getBaseHeaders() });
        console.log(`Initial CSRF check: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect: ${e.message}`);
    }

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Stock Movements Load Test Summary ===');
    console.log(`Total Stock IN: ${totalStockIn.count}`);
    console.log(`Total Stock OUT: ${totalStockOut.count}`);
    console.log(`Total Adjustments: ${totalAdjustments.count}`);
    console.log(`Insufficient Stock Errors: ${insufficientStockErrors.count}`);
    console.log('========================================');
}