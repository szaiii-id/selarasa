import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

// =========================================================================
// 1. CONFIGURATION & THRESHOLDS (SLA UNTUK MODULE USER)
// =========================================================================
export const options = {
    scenarios: {
        user_module_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '20s', target: 50 },  // Ramp-up
                { duration: '1m', target: 50 },   // Stable Load
                { duration: '20s', target: 0 },   // Ramp-down
            ],
        },
    },
    thresholds: {
        // SLA: Paginasi langsung ke PostgreSQL
        'http_req_duration{type:get_users_list}': ['p(95)<300'], 
        // SLA: Write operation (Transaction & Hash)
        'http_req_duration{type:create_user}': ['p(95)<500'],
        // SLA KETAT: Membaca profil individu (Menggunakan Redis Cache)
        'http_req_duration{type:get_user_profile}': ['p(95)<150'], 
        // SLA: Deactivate operation (Guard Validation & Update)
        'http_req_duration{type:deactivate_user}': ['p(95)<500'],
        'http_req_failed': ['rate<0.01'], 
    },
};

// =========================================================================
// 2. ENVIRONMENT & TEST DATA
// =========================================================================
const BASE_URL = 'http://selarasa:8001';
const FRONTEND_URL = 'http://selarasa:5174'; 

const users = new SharedArray('test admins', function () {
    return Array.from({ length: 30 }, (_, i) => ({
        username: `user_test_${i + 1}`,
        password: 'password_testing_123',
    }));
});

// =========================================================================
// 3. MAIN TEST SCENARIO
// =========================================================================
export default function () {
    const user = users[(__VU - 1) % users.length];
    const jar = http.cookieJar();

    const baseHeaders = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': FRONTEND_URL,
        'Origin': FRONTEND_URL,
    };

    // --- FASE 1: SANCTUM CSRF HANDSHAKE ---
    const csrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { 
        headers: baseHeaders, jar: jar, tags: { type: 'csrf_handshake' },
    });

    let xsrfToken = csrfRes.cookies && csrfRes.cookies['XSRF-TOKEN'] 
        ? decodeURIComponent(csrfRes.cookies['XSRF-TOKEN'][0].value) 
        : '';

    // --- FASE 2: LOGIN ---
    const loginPayload = JSON.stringify({ username: user.username, password: user.password });
    const loginRes = http.post(`${BASE_URL}/api-test/v1/backoffice/auth/login`, loginPayload, {
        headers: { ...baseHeaders, 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfToken },
        jar: jar, tags: { type: 'backoffice_login' },
    });

    if (loginRes.status !== 200) return;

    // --- FASE 3: REFRESH CSRF TOKEN ---
    const refreshCsrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`, { 
        headers: baseHeaders, jar: jar, tags: { type: 'csrf_refresh' },
    });

    if (refreshCsrfRes.cookies && refreshCsrfRes.cookies['XSRF-TOKEN']) {
        xsrfToken = decodeURIComponent(refreshCsrfRes.cookies['XSRF-TOKEN'][0].value);
    }

    const mutationHeaders = { ...baseHeaders, 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrfToken };
    const getHeaders = { ...baseHeaders, 'X-XSRF-TOKEN': xsrfToken };

    sleep(1);

    // ---------------------------------------------------------
    // TEST 1: GET PAGINATED USERS (Test PostgreSQL Read)
    // ---------------------------------------------------------
    group('User Module: Get Paginated List', function () {
        const res = http.get(`${BASE_URL}/api-test/v1/backoffice/users?per_page=15`, {
            headers: getHeaders, jar: jar, tags: { type: 'get_users_list' },
        });

        check(res, {
            'Get users status is 200': (r) => r.status === 200,
            'Has pagination data structure': (r) => r.json('data') !== undefined,
        });
    });

    sleep(1);

    // Variabel untuk menyimpan ID user yang baru dibuat
    let newUserId = null;

    // ---------------------------------------------------------
    // TEST 2: CREATE USER (Test PostgreSQL Write & Transaction)
    // ---------------------------------------------------------
    group('User Module: Create New User', function () {
        const uniqueId = `${__VU}_${Date.now()}`;
        const createPayload = JSON.stringify({
            name: `LoadTest User ${uniqueId}`,
            username: `lt_user_${uniqueId}`,
            password: 'Password123!',
            role: 'cashier',
            is_active: true,
        });

        const res = http.post(`${BASE_URL}/api-test/v1/backoffice/users`, createPayload, {
            headers: mutationHeaders, jar: jar, tags: { type: 'create_user' },
        });

        check(res, {
            'Create user status is 201': (r) => r.status === 201,
        });

        if (res.status === 201) {
            newUserId = res.json('data.id'); // Ekstrak ID untuk tes selanjutnya
        }
    });

    sleep(1);

    // Jalankan Test 3 & 4 hanya jika Test 2 berhasil membuat user
    if (newUserId) {
        
        // ---------------------------------------------------------
        // TEST 3: GET USER PROFILE (Test Redis Cache)
        // ---------------------------------------------------------
        group('User Module: Get Profile', function () {
            const res = http.get(`${BASE_URL}/api-test/v1/backoffice/users/${newUserId}`, {
                headers: getHeaders, jar: jar, tags: { type: 'get_user_profile' },
            });

            check(res, {
                'Get profile status is 200': (r) => r.status === 200,
                'Profile ID matches': (r) => r.json('data.id') === newUserId,
            });
        });

        sleep(1);

        // ---------------------------------------------------------
        // TEST 4: DEACTIVATE USER (Test Logic Guard & Data Integrity)
        // ---------------------------------------------------------
        group('User Module: Deactivate User', function () {
            const res = http.patch(`${BASE_URL}/api-test/v1/backoffice/users/${newUserId}/deactivate`, null, {
                headers: mutationHeaders, jar: jar, tags: { type: 'deactivate_user' },
            });

            check(res, {
                'Deactivate status is 200': (r) => r.status === 200,
                'Success message received': (r) => r.json('message') === 'User has been deactivated successfully.',
            });
        });

        sleep(1);
    }
}