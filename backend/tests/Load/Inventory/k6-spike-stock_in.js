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

const totalStockIn = new Counter('total_stock_in');
const totalStockOut = new Counter('total_stock_out');
const insufficientStockErrors = new Counter('insufficient_stock_errors');

// =========================================================================
// CONFIGURATION - SPIKE TEST
// =========================================================================
// Skenario: Traffic naik drastis 0 → 500 VUs dalam 10 detik,
// tahan sebentar, lalu turun drastis. Ini mensimulasikan "flash sale"
// atau "restock massal" di mana banyak user mengakses bersamaan.
export const options = {
    scenarios: {
        spike_stock_in: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 100 },   // Pre-spike: warm up
                { duration: '5s',  target: 500 },   // SPIKE: naik drastis ke 500
                { duration: '30s', target: 500 },   // Hold spike: tahan 500 VUs
                { duration: '10s', target: 100 },   // Recovery: turun ke 100
                { duration: '20s', target: 0 },     // Cool down
            ],
            gracefulRampDown: '30s',
        },
    },
    thresholds: {
        'http_req_duration{type:csrf_handshake}': ['p(95)<500'],
        'csrf_success_rate': ['rate>0.95'],
        'login_success_rate': ['rate>0.90'],

        'http_req_duration{type:stock_in}': ['p(95)<1500'],
        'stock_in_success': ['rate>0.90'],

        'http_req_duration{type:stock_out}': ['p(95)<1500'],
        'stock_out_success': ['rate>0.85'],

        'http_req_duration{type:get_movements}': ['p(95)<1000'],
        'get_movements_success': ['rate>0.90'],

        // Longgar karena spike test memang menguji batas
        'http_req_failed': ['rate<0.15'],
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
        'User-Agent': 'k6-spike-test',
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
            tags: { type: 'backoffice_login' },
        });
    } catch (e) {
        return { success: false };
    }
    const success = res.status === 200;
    loginSuccessRate.add(success);
    return { success };
}

// =========================================================================
// MAIN TEST SCENARIO - SPIKE
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

    // SPIKE: Concurrent IN (simulasi flash restock)
    // Setiap iterasi kirim 3 IN berturut-turut untuk memperbesar beban
    group('Spike: Rapid Stock IN', function () {
        for (let i = 0; i < 3; i++) {
            const uniqueRef = `SPIKE-IN-${__VU}-${__ITER}-${i}-${Date.now()}`;
            const payload = JSON.stringify({
                raw_material_id: MATERIAL_ID,
                movement_type: 'IN',
                quantity: 5,
                reason: `K6 spike IN batch ${i}`,
                reference_id: uniqueRef,
            });

            const start = Date.now();
            const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, {
                headers: authHeaders, jar: jar, tags: { type: 'stock_in' },
            });
            stockInDuration.add(Date.now() - start);

            const success = res.status === 201;
            stockInSuccessRate.add(success);

            if (success) {
                totalStockIn.add(1);
            } else {
                logError('SPIKE_IN', res, user);
            }
        }
    });

    // SPIKE: Get movements untuk verifikasi
    group('Spike: Get Movements', function () {
        const start = Date.now();
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/inventory/movements?raw_material_id=${MATERIAL_ID}&per_page=10`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_movements' } }
        );
        getMovementsDuration.add(Date.now() - start);

        const success = res.status === 200;
        getMovementsSuccessRate.add(success);

        check(res, {
            'Get movements status is 200': (r) => r.status === 200,
        });
    });

    // Coba OUT untuk verifikasi stock masih konsisten
    group('Spike: Stock OUT', function () {
        const uniqueRef = `SPIKE-OUT-${__VU}-${__ITER}-${Date.now()}`;
        const payload = JSON.stringify({
            raw_material_id: MATERIAL_ID,
            movement_type: 'OUT',
            quantity: 1,
            reason: 'K6 spike OUT verify',
            reference_id: uniqueRef,
        });

        const start = Date.now();
        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/movements`, payload, {
            headers: authHeaders, jar: jar, tags: { type: 'stock_out' },
        });
        stockOutDuration.add(Date.now() - start);

        const success = res.status === 201;
        stockOutSuccessRate.add(success);

        if (success) {
            totalStockOut.add(1);
        } else if (res.status === 422) {
            insufficientStockErrors.add(1);
        }
    });

    // Minimal think time — spike test tidak boleh banyak sleep
    sleep(0.5);
}

export function setup() {
    console.log('=== SPIKE Test: Stock IN ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Target Material ID: ${MATERIAL_ID}`);
    console.log('Scenario: 0 → 500 VUs in 5s, hold 30s, cool down');
    console.log('Simulating flash restock / mass stock IN');
    console.log('============================');

    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { headers: getBaseHeaders() });
        console.log(`Initial CSRF check: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect: ${e.message}`);
    }

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Spike Test Summary ===');
    console.log(`Total Stock IN: ${totalStockIn.count}`);
    console.log(`Total Stock OUT: ${totalStockOut.count}`);
    console.log(`Insufficient Stock Errors: ${insufficientStockErrors.count}`);
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('==========================');
}