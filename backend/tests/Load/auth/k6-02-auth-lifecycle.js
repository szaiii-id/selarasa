import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

export const options = {
    stages: [
        { duration: '10s', target: 20 },
        { duration: '40s', target: 20 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'],
        'http_req_failed': ['rate<0.01'],
        'http_req_duration{flow:01_login}': ['p(95)<500'],
        'http_req_duration{flow:02_get_me}': ['p(95)<300'],
        'http_req_duration{flow:03_logout}': ['p(95)<400'],
    },
};

const BASE_URL_ROOT = 'http://localhost:8001';
const BASE_URL = 'http://localhost:8001/api-test/v1';

const users = new SharedArray('lifecycle users', function () {
    return Array.from({ length: 30 }, (_, i) => ({
        username: `user_test_${i + 1}`,
        password: 'password_testing_123',
    }));
});

export default function () {
    const user = users[(__VU - 1) % users.length];
    
    // Cookie Jar terisolasi untuk tiap Virtual User
    const jar = new http.CookieJar();

    const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'http://localhost:8001',
        'Origin': 'http://localhost:8001',
    };

    // Fungsi bantu untuk selalu mengambil nilai XSRF-TOKEN terbaru dari jar
    const getXsrfHeader = () => {
        const cookies = jar.cookiesForURL(BASE_URL_ROOT);
        if (cookies['XSRF-TOKEN'] && cookies['XSRF-TOKEN'].length > 0) {
            return { 'X-XSRF-TOKEN': decodeURIComponent(cookies['XSRF-TOKEN'][0]) };
        }
        return {};
    };

    // --- STEP 0: INISIALISASI CSRF COOKIE ---
    const csrfRes = http.get(`${BASE_URL_ROOT}/sanctum/csrf-cookie`, { 
        jar: jar, 
        headers: baseHeaders 
    });

    if (csrfRes.status !== 204 && csrfRes.status !== 200) {
        return;
    }

    // --- STEP 1: LOGIN ---
    const loginRes = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify(user),
        { 
            headers: { ...baseHeaders, ...getXsrfHeader() }, 
            jar: jar, 
            tags: { flow: '01_login' } 
        }
    );

    const isLoginOk = check(loginRes, {
        'login: status 200': (r) => r.status === 200,
    });

    if (!isLoginOk) {
        sleep(1);
        return;
    }

    sleep(Math.random() + 0.5);

    // --- STEP 2: CEK PROFIL (/me) ---
    const meRes = http.get(`${BASE_URL}/auth/me`, {
        headers: { ...baseHeaders, ...getXsrfHeader() },
        jar: jar, 
        tags: { flow: '02_get_me' },
    });

    if (meRes.status !== 200) {
        console.log(`[ME ERROR - Status ${meRes.status}]: ${meRes.body}`);
    }

    check(meRes, {
        'me: status 200': (r) => r.status === 200,
        'me: returns username': (r) => r.status === 200 && r.body.includes(user.username),
    });

    sleep(Math.random() + 0.5);

    // --- STEP 3: LOGOUT ---
    // Pastikan XSRF-Token ter-update sebelum melakukan POST logout
    const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, {
        headers: { ...baseHeaders, ...getXsrfHeader() },
        jar: jar, 
        tags: { flow: '03_logout' },
    });

    if (logoutRes.status !== 200 && logoutRes.status !== 204) {
        console.log(`[LOGOUT ERROR - Status ${logoutRes.status}]: ${logoutRes.body}`);
    }

    check(logoutRes, {
        'logout: status 200/204': (r) => r.status === 200 || r.status === 204,
    });

    sleep(1);
}