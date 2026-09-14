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
const insufficientStockRate = new Rate('insufficient_stock_rate');

const stockInDuration = new Trend('stock_in_duration', true);
const stockOutDuration = new Trend('stock_out_duration', true);
const getMovementsDuration = new Trend('get_movements_duration', true);

const totalStockIn = new Counter('total_stock_in');
const totalStockOut = new Counter('total_stock_out');
const insufficientStockErrors = new Counter('insufficient_stock_errors');
const uniqueMaterialsUsed = new Counter('unique_materials_used');

// =========================================================================
// CONFIGURATION - SPIKE TEST (MULTI MATERIAL / SPREAD LOAD)
// =========================================================================
// Skenario: Sama seperti spike test single-material (0 → 500 VUs),
// TAPI setiap VU mengakses MATERIAL_ID yang BERBEDA dari 50 material.
// Tujuan: Membuktikan bahwa bottleneck sebelumnya adalah LOCK CONTENTION,
// bukan masalah kapasitas server.
//
// Expected Result:
// - Latency TURUN drastis (~50-200ms, bukan 4000ms)
// - Throughput NAIK signifikan
// - Bukti aplikasi SCALABLE saat contention rendah
export const options = {
    scenarios: {
        spike_stock_in_multi: {
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
        // Threshold KETAT karena tidak ada lock contention
        'http_req_duration{type:csrf_handshake}': ['p(95)<500'],
        'csrf_success_rate': ['rate>0.95'],
        'login_success_rate': ['rate>0.95'],

        'http_req_duration{type:stock_in}': ['p(95)<500'],
        'stock_in_success': ['rate>0.95'],

        'http_req_duration{type:stock_out}': ['p(95)<500'],
        'stock_out_success': ['rate>0.95'],

        'http_req_duration{type:get_movements}': ['p(95)<500'],
        'get_movements_success': ['rate>0.95'],

        'http_req_failed': ['rate<0.05'],
    },
};

// =========================================================================
// ENVIRONMENT & TEST DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

// JUMLAH MATERIAL YANG DIPAKAI
// Seeder membuat 50 material (5 kategori x 10 material).
// Jika material lebih sedikit, sesuaikan env MATERIAL_COUNT.
const MATERIAL_COUNT = parseInt(__ENV.MATERIAL_COUNT) || 50;

// Array material ID: 1, 2, 3, ..., 50
const MATERIAL_IDS = new SharedArray('material_ids', function () {
    const count = parseInt(__ENV.MATERIAL_COUNT) || 50;
    return Array.from({ length: count }, (_, i) => i + 1);
});

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
        'User-Agent': 'k6-spike-multi-test',
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
// MAIN TEST SCENARIO - SPIKE MULTI MATERIAL
// =========================================================================
export default function () {
    const user = managers[(__VU - 1) % managers.length];
    const jar = http.cookieJar();

    // ============================================================
    // KUNCI UTAMA: PILIH MATERIAL ID YANG BERBEDA UNTUK SETIAP VU
    // ============================================================
    // Setiap VU mendapat material ID yang berbeda, sehingga lock
    // contention tersebar merata. Contoh:
    // - VU 1  → material 1
    // - VU 2  → material 2
    // - VU 50 → material 50
    // - VU 51 → material 1 (kembali ke awal, tapi tidak masalah)
    // - VU 500 → material 50
    //
    // Dengan 500 VUs dan 50 materials → ~10 VUs per material.
    // Lock contention jauh lebih rendah dibanding 500 VUs per material.
    const materialId = MATERIAL_IDS[(__VU - 1) % MATERIAL_IDS.length];

    // Track unique materials (in-memory per VU, akan di-aggregate oleh k6)
    uniqueMaterialsUsed.add(1);

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

    // ============================================================
    // SPIKE: Rapid Stock IN ke material yang di-assign
    // ============================================================
    group('Spike Multi: Rapid Stock IN', function () {
        for (let i = 0; i < 3; i++) {
            const uniqueRef = `SPIKE-M-IN-${__VU}-${__ITER}-${i}-${Date.now()}`;
            const payload = JSON.stringify({
                raw_material_id: materialId,
                movement_type: 'IN',
                quantity: 5,
                reason: `K6 spike multi IN batch ${i} (material ${materialId})`,
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
                logError('SPIKE_MULTI_IN', res, user);
            }
        }
    });

    // ============================================================
    // VERIFIKASI: Get movements untuk material yang di-assign
    // ============================================================
    group('Spike Multi: Get Movements', function () {
        const start = Date.now();
        const res = http.get(
            `${BASE_URL}/api-test/v1/backoffice/inventory/movements?raw_material_id=${materialId}&per_page=10`,
            { headers: getHeaders, jar: jar, tags: { type: 'get_movements' } }
        );
        getMovementsDuration.add(Date.now() - start);

        const success = res.status === 200;
        getMovementsSuccessRate.add(success);

        check(res, {
            'Get movements status is 200': (r) => r.status === 200,
        });
    });

    // ============================================================
    // VERIFIKASI: Stock OUT untuk cek konsistensi
    // ============================================================
    group('Spike Multi: Stock OUT', function () {
        const uniqueRef = `SPIKE-M-OUT-${__VU}-${__ITER}-${Date.now()}`;
        const payload = JSON.stringify({
            raw_material_id: materialId,
            movement_type: 'OUT',
            quantity: 1,
            reason: `K6 spike multi OUT verify (material ${materialId})`,
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
            insufficientStockRate.add(true);
        }
    });

    // Minimal think time
    sleep(0.5);
}

// =========================================================================
// SETUP & TEARDOWN
// =========================================================================
export function setup() {
    console.log('=== SPIKE Test (MULTI MATERIAL) ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Material Count: ${MATERIAL_COUNT} (IDs: 1-${MATERIAL_COUNT})`);
    console.log('Scenario: 0 → 500 VUs, spread across 50 materials');
    console.log('');
    console.log('EXPECTED RESULT:');
    console.log('- Latency should DROP to ~50-200ms (vs 4000ms in single-material)');
    console.log('- Throughput should INCREASE significantly');
    console.log('- Proves system is SCALABLE when lock contention is low');
    console.log('====================================');

    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { headers: getBaseHeaders() });
        console.log(`Initial CSRF check: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect: ${e.message}`);
    }

    return {
        startTime: new Date().toISOString(),
        materialCount: MATERIAL_COUNT,
    };
}

export function teardown(data) {
    console.log('\n=== Spike Multi-Material Test Summary ===');
    console.log(`Total Stock IN: ${totalStockIn.count}`);
    console.log(`Total Stock OUT: ${totalStockOut.count}`);
    console.log(`Insufficient Stock Errors: ${insufficientStockErrors.count}`);
    console.log(`Unique Materials Used: ${uniqueMaterialsUsed.count}`);
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('');
    console.log('COMPARISON vs Single-Material Spike:');
    console.log('- Single-material: p(95) ~4s, throughput ~55 req/s');
    console.log('- Multi-material: expected p(95) <500ms, throughput ~3-5x higher');
    console.log('=========================================');
}