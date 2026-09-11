import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const stockInSuccessRate = new Rate('stock_in_success');
const stockOutSuccessRate = new Rate('stock_out_success');
const getMovementsSuccessRate = new Rate('get_movements_success');

const stockInDuration = new Trend('stock_in_duration', true);
const stockOutDuration = new Trend('stock_out_duration', true);
const getMovementsDuration = new Trend('get_movements_duration', true);

const totalIterations = new Counter('total_iterations');
const insufficientStockErrors = new Counter('insufficient_stock_errors');

// =========================================================================
// CONFIGURATION - SOAK TEST (Long Duration, Moderate Load)
// =========================================================================
export const options = {
    scenarios: {
        soak_stock_movements: {
            executor: 'constant-vus',
            vus: 20,
            duration: '10m', // Soak test: 10 menit dengan load konstan
        },
    },
    thresholds: {
        'http_req_duration{type:csrf_handshake}': ['p(95)<300'],
        'csrf_success_rate': ['rate>0.99'],
        'login_success_rate': ['rate>0.95'],

        'http_req_duration{type:stock_in}': ['p(95)<800'],
        'stock_in_success': ['rate>0.95'],

        'http_req_duration{type:stock_out}': ['p(95)<800'],
        'stock_out_success': ['rate>0.90'],

        'http_req_duration{type:get_movements}': ['p(95)<500'],
        'get_movements_success': ['rate>0.95'],

        // Memory leak detection: tidak boleh ada penurunan throughput
        'http_req_failed': ['rate<0.10'],
    },
};

// =========================================================================
// ENVIRONMENT
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
        'User-Agent': 'k6-soak-test',
    };
}

function performCsrfHandshake(jar) {
    let res;
    try {
        res = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
            headers: getBaseHeaders(),
            jar: jar,
            tags: { type: 'csrf_handshake' },
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
// MAIN TEST SCENARIO - SOAK
// =========================================================================
export default function () {
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

    const getHeaders = {
        ...getBaseHeaders(),
        'X-XSRF-TOKEN': refresh.token,
    };

    // SOAK: Repeated IN → OUT → GET untuk detect memory leak / resource exhaustion
    group('Soak: Stock IN → OUT → GET', function () {
        // 1. Stock IN
        const inStart = Date.now();
        const inRes = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`,
            JSON.stringify({
                raw_material_id: MATERIAL_ID,
                movement_type: 'IN',
                quantity: 10,
                reason: `K6 soak IN iter ${__ITER}`,
                reference_id: `SOAK-IN-${__VU}-${__ITER}`,
            }),
            { headers: authHeaders, jar: jar, tags: { type: 'stock_in' } }
        );
        stockInDuration.add(Date.now() - inStart);
        const inSuccess = inRes.status === 201;
        stockInSuccessRate.add(inSuccess);
        check(inRes, { 'Soak IN status is 201': (r) => r.status === 201 });

        // 2. Stock OUT
        const outStart = Date.now();
        const outRes = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`,
            JSON.stringify({
                raw_material_id: MATERIAL_ID,
                movement_type: 'OUT',
                quantity: 5,
                reason: `K6 soak OUT iter ${__ITER}`,
                reference_id: `SOAK-OUT-${__VU}-${__ITER}`,
            }),
            { headers: authHeaders, jar: jar, tags: { type: 'stock_out' } }
        );
        stockOutDuration.add(Date.now() - outStart);
        const outSuccess = outRes.status === 201;
        stockOutSuccessRate.add(outSuccess);
        
        if (outRes.status === 422) {
            insufficientStockErrors.add(1);
        }

        // 3. GET Movements
        const getStart = Date.now();
        const getRes = http.get(
            `${BASE_URL}/api-test/v1/backoffice/inventory/movements?raw_material_id=${MATERIAL_ID}&per_page=10`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_movements' } }
        );
        getMovementsDuration.add(Date.now() - getStart);
        const getSuccess = getRes.status === 200;
        getMovementsSuccessRate.add(getSuccess);

        totalIterations.add(1);
    });

    // Think time 1-3 detik
    sleep(Math.random() * 2 + 1);
}

export function setup() {
    console.log('=== Soak Test: Stock Movements ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Target Material ID: ${MATERIAL_ID}`);
    console.log(`Duration: 10 minutes`);
    console.log('Monitoring for memory leaks and resource exhaustion...');
    console.log('==================================');

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Soak Test Summary ===');
    console.log(`Total Iterations: ${totalIterations.count}`);
    console.log(`Insufficient Stock Errors: ${insufficientStockErrors.count}`);
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('=========================');
}