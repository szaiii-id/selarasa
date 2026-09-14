import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend, Counter } from 'k6/metrics';

// =========================================================================
// CUSTOM METRICS
// =========================================================================
const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const getCategoriesListSuccessRate = new Rate('get_categories_list_success');
const getAllCategoriesSuccessRate = new Rate('get_all_categories_success');
const createCategorySuccessRate = new Rate('create_category_success');
const showCategorySuccessRate = new Rate('show_category_success');
const updateCategorySuccessRate = new Rate('update_category_success');
const deleteCategorySuccessRate = new Rate('delete_category_success');

const getCategoriesListDuration = new Trend('get_categories_list_duration', true);
const getAllCategoriesDuration = new Trend('get_all_categories_duration', true);
const createCategoryDuration = new Trend('create_category_duration', true);
const showCategoryDuration = new Trend('show_category_duration', true);
const updateCategoryDuration = new Trend('update_category_duration', true);
const deleteCategoryDuration = new Trend('delete_category_duration', true);

const totalCategoriesCreated = new Counter('total_categories_created');
const totalCategoriesUpdated = new Counter('total_categories_updated');
const totalCategoriesDeleted = new Counter('total_categories_deleted');

// =========================================================================
// CONFIGURATION & THRESHOLDS
// =========================================================================
export const options = {
    scenarios: {
        categories_load_test: {
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

        'http_req_duration{type:get_categories_list}': ['p(95)<300'],
        'get_categories_list_success': ['rate>0.95'],

        'http_req_duration{type:get_all_categories}': ['p(95)<200'],
        'get_all_categories_success': ['rate>0.95'],

        'http_req_duration{type:create_category}': ['p(95)<500'],
        'create_category_success': ['rate>0.95'],

        'http_req_duration{type:show_category}': ['p(95)<200'],
        'show_category_success': ['rate>0.95'],

        'http_req_duration{type:update_category}': ['p(95)<500'],
        'update_category_success': ['rate>0.95'],

        'http_req_duration{type:delete_category}': ['p(95)<500'],
        'delete_category_success': ['rate>0.95'],

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
    const xsrfToken = getXsrfToken(csrfRes.cookies);
    const success = (csrfRes.status === 200 || csrfRes.status === 204) && xsrfToken.length > 0;
    csrfSuccessRate.add(success);
    return { response: csrfRes, token: xsrfToken, success };
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

    // TEST 1: GET PAGINATED CATEGORIES
    group('Categories: Get Paginated', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/categories?per_page=15`, {
            headers: getHeaders, jar: jar, tags: { type: 'get_categories_list' },
        });
        getCategoriesListDuration.add(Date.now() - start);

        const success = res.status === 200 && res.json('data') !== undefined;
        getCategoriesListSuccessRate.add(success);

        check(res, {
            'Get categories status is 200': (r) => r.status === 200,
            'Has pagination data': (r) => r.json('data') !== undefined && r.json('meta') !== undefined,
        });

        if (!success) logError('GET_CATEGORIES', res, user);
    });

    sleep(1);

    // TEST 2: GET ALL CATEGORIES (Dropdown)
    group('Categories: Get All (Dropdown)', function () {
        const start = Date.now();
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/categories?all=true`, {
            headers: getHeaders, jar: jar, tags: { type: 'get_all_categories' },
        });
        getAllCategoriesDuration.add(Date.now() - start);

        const success = res.status === 200 && res.json('data') !== undefined;
        getAllCategoriesSuccessRate.add(success);

        check(res, {
            'Get all categories status is 200': (r) => r.status === 200,
        });

        if (!success) logError('GET_ALL_CATEGORIES', res, user);
    });

    sleep(1);

    // TEST 3: CREATE CATEGORY
    let newCategoryId = null;

    group('Categories: Create', function () {
        const uniqueId = `${__VU}_${Date.now()}_${__ITER}`;
        const payload = JSON.stringify({
            name: `Load Test Category ${uniqueId}`,
            description: 'Auto-generated by K6 load test',
        });

        const start = Date.now();
        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/inventory/categories`, payload, {
            headers: mutationHeaders, jar: jar, tags: { type: 'create_category' },
        });
        createCategoryDuration.add(Date.now() - start);

        const success = res.status === 201;
        createCategorySuccessRate.add(success);

        check(res, {
            'Create category status is 201': (r) => r.status === 201,
            'Created category has ID': (r) => r.json('data.id') !== undefined,
        });

        if (success) {
            newCategoryId = res.json('data.id');
            totalCategoriesCreated.add(1);
        } else {
            logError('CREATE_CATEGORY', res, user);
        }
    });

    sleep(1);

    if (newCategoryId) {
        // TEST 4: SHOW CATEGORY
        group('Categories: Show', function () {
            const start = Date.now();
            const res = http.get(`${BASE_URL}/api-test/v1/backoffice/inventory/categories/${newCategoryId}`, {
                headers: getHeaders, jar: jar, tags: { type: 'show_category' },
            });
            showCategoryDuration.add(Date.now() - start);

            const success = res.status === 200 && res.json('data.id') === newCategoryId;
            showCategorySuccessRate.add(success);

            check(res, {
                'Show category status is 200': (r) => r.status === 200,
            });

            if (!success) logError('SHOW_CATEGORY', res, user);
        });

        sleep(1);

        // TEST 5: UPDATE CATEGORY
        group('Categories: Update', function () {
            const payload = JSON.stringify({
                name: `Updated Category ${Date.now()}`,
                description: 'Updated by K6',
            });

            const start = Date.now();
            const res = http.put(`${BASE_URL}/api-test/v1/backoffice/inventory/categories/${newCategoryId}`, payload, {
                headers: mutationHeaders, jar: jar, tags: { type: 'update_category' },
            });
            updateCategoryDuration.add(Date.now() - start);

            const success = res.status === 200;
            updateCategorySuccessRate.add(success);

            check(res, {
                'Update category status is 200': (r) => r.status === 200,
            });

            if (success) totalCategoriesUpdated.add(1);
            else logError('UPDATE_CATEGORY', res, user);
        });

        sleep(1);

        // TEST 6: DELETE CATEGORY
        group('Categories: Delete', function () {
            const start = Date.now();
            const res = http.del(`${BASE_URL}/api-test/v1/backoffice/inventory/categories/${newCategoryId}`, null, {
                headers: mutationHeaders, jar: jar, tags: { type: 'delete_category' },
            });
            deleteCategoryDuration.add(Date.now() - start);

            const success = res.status === 200;
            deleteCategorySuccessRate.add(success);

            check(res, {
                'Delete category status is 200': (r) => r.status === 200,
            });

            if (success) totalCategoriesDeleted.add(1);
            else logError('DELETE_CATEGORY', res, user);
        });
    }
}

export function setup() {
    console.log('=== Categories Load Test Setup ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Total Managers: ${managers.length}`);
    console.log('===================================');

    try {
        const health = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { headers: getBaseHeaders() });
        console.log(`Initial CSRF check: ${health.status}`);
    } catch (e) {
        console.error(`Cannot connect to ${BASE_URL}: ${e.message}`);
    }

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n=== Categories Load Test Summary ===');
    console.log(`Created: ${totalCategoriesCreated.count}`);
    console.log(`Updated: ${totalCategoriesUpdated.count}`);
    console.log(`Deleted: ${totalCategoriesDeleted.count}`);
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('====================================');
}