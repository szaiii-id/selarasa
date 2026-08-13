import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// =========================================================================
// 1. CONFIGURATION & THRESHOLDS (SLA)
// =========================================================================
export const options = {
    scenarios: {
        pos_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 200 }, // Ramp-up
                { duration: '2m', target: 200 }, // Stable Load
                { duration: '30s', target: 0 },  // Ramp-down
            ],
        },
    },
    thresholds: {
        'http_req_duration{type:csrf_handshake}': ['p(95)<500'],
        'http_req_duration{type:pos_login}': ['p(95)<800'],
        'http_req_failed{type:pos_login}': ['rate<0.01'],
        'http_req_failed{type:pos_logout}': ['rate<0.01'],
    },
};

// =========================================================================
// 2. ENVIRONMENT VARIABLES & TEST DATA
// =========================================================================
const BASE_URL = 'http://selarasa:8001';

// Port POS (5173)
const FRONTEND_URL = 'http://selarasa:5173';

// Reuse user_test_1..30 dari K6LoadTestSeeder
const users = new SharedArray('pos users', function () {
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

    // ---------------------------------------------------------
    // FASE 1: SANCTUM CSRF HANDSHAKE (SEBELUM LOGIN)
    // ---------------------------------------------------------
    const csrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
        headers: baseHeaders,
        jar: jar,
        tags: { type: 'csrf_handshake' },
    });

    let xsrfToken = '';
    if (csrfRes.cookies && csrfRes.cookies['XSRF-TOKEN']) {
        xsrfToken = decodeURIComponent(csrfRes.cookies['XSRF-TOKEN'][0].value);
    }

    // ---------------------------------------------------------
    // FASE 2: AUTHENTICATION REQUEST (POS LOGIN)
    // ---------------------------------------------------------
    const loginPayload = JSON.stringify({
        username: user.username,
        password: user.password,
    });

    const loginRes = http.post(`${BASE_URL}/api-test/v1/pos/auth/login`, loginPayload, {
        headers: Object.assign({}, baseHeaders, {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': xsrfToken,
        }),
        jar: jar,
        tags: { type: 'pos_login' },
    });

    if (loginRes.status !== 200) {
        let errorMsg = loginRes.body;
        const titleMatch = loginRes.body.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            errorMsg = `Halaman HTML: ${titleMatch[1]}`;
        }
        console.error(`[VU ${__VU}] LOGIN Status: ${loginRes.status} | Info: ${errorMsg}`);
    }

    check(loginRes, {
        'Login status is 200': (r) => r.status === 200,
        'Has valid session cookie': (r) => {
            return r.cookies && Object.keys(r.cookies).some(
                name => name.toLowerCase().includes('session')
            );
        }
    });

    // ---------------------------------------------------------
    // FASE 3: PERBARUI CSRF TOKEN SETELAH LOGIN (BULLETPROOF FIX)
    // ---------------------------------------------------------
    // Memaksa ambil token paling fresh dengan menembak ulang endpoint csrf-cookie
    // setelah sesi baru terbentuk akibat login yang sukses.
    const refreshCsrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`, {
        headers: baseHeaders,
        jar: jar,
        tags: { type: 'csrf_refresh' },
    });

    if (refreshCsrfRes.cookies && refreshCsrfRes.cookies['XSRF-TOKEN']) {
        xsrfToken = decodeURIComponent(refreshCsrfRes.cookies['XSRF-TOKEN'][0].value);
    }
    
    // Header otentikasi baru siap digunakan untuk request selanjutnya
    const authHeaders = { ...baseHeaders, 'X-XSRF-TOKEN': xsrfToken };

    sleep(Math.random() * 1.5 + 1); // Think time

    // ---------------------------------------------------------
    // FASE 4: GET AUTHENTICATED USER (/me)
    // ---------------------------------------------------------
    const meRes = http.get(`${BASE_URL}/api-test/v1/auth/me`, {
        headers: authHeaders,
        jar: jar,
        tags: { type: 'pos_me' },
    });

    check(meRes, {
        'Me status is 200': (r) => r.status === 200,
        'Me returns correct username': (r) =>
            r.status === 200 && r.body.includes(user.username),
    });

    sleep(Math.random() * 1.5 + 1); // Think time

    // ---------------------------------------------------------
    // FASE 5: LOGOUT
    // ---------------------------------------------------------
    const logoutRes = http.post(`${BASE_URL}/api-test/v1/auth/logout`, null, {
        headers: authHeaders, // Menggunakan xsrfToken yang baru di-refresh!
        jar: jar,
        tags: { type: 'pos_logout' },
    });

    if (logoutRes.status !== 200) {
        let errorMsg = logoutRes.body;
        const titleMatch = logoutRes.body.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            errorMsg = `Halaman HTML: ${titleMatch[1]}`;
        }
        console.error(`[VU ${__VU}] LOGOUT Status: ${logoutRes.status} | Info: ${errorMsg}`);
    }

    check(logoutRes, {
        'Logout status is 200': (r) => r.status === 200,
    });

    sleep(Math.random() * 1.5 + 1); // Think time
}