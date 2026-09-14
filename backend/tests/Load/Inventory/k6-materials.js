import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const getMaterialsListSuccessRate = new Rate('get_materials_list_success');
const createMaterialSuccessRate = new Rate('create_material_success');
const showMaterialSuccessRate = new Rate('show_material_success');
const updateMaterialSuccessRate = new Rate('update_material_success');
const filterMaterialsSuccessRate = new Rate('filter_materials_success');

const getMaterialsListDuration = new Trend('get_materials_list_duration', true);
const createMaterialDuration = new Trend('create_material_duration', true);
const showMaterialDuration = new Trend('show_material_duration', true);
const updateMaterialDuration = new Trend('update_material_duration', true);
const filterMaterialsDuration = new Trend('filter_materials_duration', true);

const totalMaterialsCreated = new Counter('total_materials_created');
const totalMaterialsUpdated = new Counter('total_materials_updated');

// =========================================================================
// CONFIGURATION & THRESHOLDS
// =========================================================================
export const options = {
    scenarios: {
        materials_load_test: {
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

        'http_req_duration{type:get_materials_list}': ['p(95)<300'],
        'get_materials_list_success': ['rate>0.95'],

        'http_req_duration{type:filter_materials}': ['p(95)<400'],
        'filter_materials_success': ['rate>0.95'],

        'http_req_duration{type:create_material}': ['p(95)<500'],
        'create_material_success': ['rate>0.95'],

        'http_req_duration{type:show_material}': ['p(95)<200'],
        'show_material_success': ['rate>0.95'],

        'http_req_duration{type:update_material}': ['p(95)<500'],
        'update_material_success': ['rate>0.95'],

        'http_req_failed': ['rate<0.01'],
    },
};

// =========================================================================
// ENVIRONMENT & TEST DATA
// =========================================================================
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5174';
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

    // Get a valid category_id from the seeded data (category_id 1 exists from seeder)
    const CATEGORY_ID = 1;

    sleep(1);

    // TEST 1: GET PAGINATED MATERIALS
    group('Materials: Get Paginated', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/materials?per_page=15`, {
            headers: getHeaders, jar: jar, tags: { type: 'get_materials_list' },
        });
        getMaterialsListDuration.add(Date.now() - start);

        const success = res.status === 200 && res.json('data') !== undefined;
        getMaterialsListSuccessRate.add(success);

        check(res, {
            'Get materials status is 200': (r) => r.status === 200,
            'Has pagination data': (r) => r.json('data') !== undefined && r.json('meta') !== undefined,
        });

        if (!success) logError('GET_MATERIALS', res, user);
    });

    sleep(1);

    // TEST 2: FILTER MATERIALS BY CATEGORY
    group('Materials: Filter by Category', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/materials?category_id=${CATEGORY_ID}`, {
            headers: getHeaders, jar: jar, tags: { type: 'filter_materials' },
        });
        filterMaterialsDuration.add(Date.now() - start);

        const success = res.status === 200;
        filterMaterialsSuccessRate.add(success);

        check(res, {
            'Filter materials status is 200': (r) => r.status === 200,
        });

        if (!success) logError('FILTER_MATERIALS', res, user);
    });

    sleep(1);

    // TEST 3: CREATE MATERIAL
    let newMaterialId = null;

    group('Materials: Create', function () {
        const uniqueId = `${__VU}_${Date.now()}_${__ITER}`;
        const payload = JSON.stringify({
            category_id: CATEGORY_ID,
            sku: `RM-K6-${uniqueId}`.substring(0, 50),
            name: `Load Test Material ${uniqueId}`,
            unit: 'kg',
            minimum_stock: 10,
            is_active: true,
        });

        const start = Date.now();
        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/materials`, payload, {
            headers: mutationHeaders, jar: jar, tags: { type: 'create_material' },
        });
        createMaterialDuration.add(Date.now() - start);

        const success = res.status === 201;
        createMaterialSuccessRate.add(success);

        check(res, {
            'Create material status is 201': (r) => r.status === 201,
            'Created material has ID': (r) => r.json('data.id') !== undefined,
            'current_stock is 0': (r) => r.json('data.current_stock') === 0,
        });

        if (success) {
            newMaterialId = res.json('data.id');
            totalMaterialsCreated.add(1);
        } else {
            logError('CREATE_MATERIAL', res, user);
        }
    });

    sleep(1);

    if (newMaterialId) {
        // TEST 4: SHOW MATERIAL
        group('Materials: Show', function () {
            const start = Date.now();
            const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/materials/${newMaterialId}`, {
                headers: getHeaders, jar: jar, tags: { type: 'show_material' },
            });
            showMaterialDuration.add(Date.now() - start);

            const success = res.status === 200 && res.json('data.id') === newMaterialId;
            showMaterialSuccessRate.add(success);

            check(res, {
                'Show material status is 200': (r) => r.status === 200,
                'Has category relationship': (r) => r.json('data.category') !== undefined,
            });

            if (!success) logError('SHOW_MATERIAL', res, user);
        });

        sleep(1);

        // TEST 5: UPDATE MATERIAL
        group('Materials: Update', function () {
            const payload = JSON.stringify({
                category_id: CATEGORY_ID,
                sku: `RM-K6-${newMaterialId}`.substring(0, 50),
                name: `Updated Material ${Date.now()}`,
                unit: 'kg',
                minimum_stock: 20,
                is_active: true,
            });

            const start = Date.now();
            const res = http.put(`${BASE_URL}/api-test/v1/backoffice/inventory/materials/${newMaterialId}`, payload, {
                headers: mutationHeaders, jar: jar, tags: { type: 'update_material' },
            });
            updateMaterialDuration.add(Date.now() - start);

            const success = res.status === 200;
            updateMaterialSuccessRate.add(success);

            check(res, {
                'Update material status is 200': (r) => r.status === 200,
            });

            if (success) totalMaterialsUpdated.add(1);
            else logError('UPDATE_MATERIAL', res, user);
        });
    }
}

export function setup() {
    console.log('=== Materials Load Test Setup ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log('=================================');

    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { headers: getBaseHeaders() });
        console.log(`Initial CSRF check: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect: ${e.message}`);
    }

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Materials Load Test Summary ===');
    console.log(`Created: ${totalMaterialsCreated.count}`);
    console.log(`Updated: ${totalMaterialsUpdated.count}`);
    console.log('==================================');
}