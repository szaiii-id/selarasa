import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ==========================================
// CONFIGURATION & SLA THRESHOLDS
// ==========================================
export const options = {
    stages: [
        { duration: '10s', target: 20 }, // Ramp-up 20 VUs
        { duration: '30s', target: 20 }, // Stable load
        { duration: '10s', target: 0 },  // Ramp-down
    ],
    thresholds: {
        'http_req_duration{endpoint:login}': ['p(95)<500'], // SLA khusus tag login
        'http_req_failed{endpoint:login}': ['rate<0.01'],
    },
};

const BASE_URL = 'http://selarasa:8001/api-test/v1';

// Pool 30 akun unik agar tidak terjadi database row lock / terblokir throttle 1 akun
const users = new SharedArray('login test users', function () {
    return Array.from({ length: 30 }, (_, i) => ({
        username: `user_test_${i + 1}`,
        password: 'password_testing_123',
    }));
});

// ==========================================
// TEST SCENARIO (ISOLATED LOGIN)
// ==========================================
export default function () {
    const user = users[(__VU - 1) % users.length];

    const payload = JSON.stringify({
        username: user.username,
        password: user.password,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Referer': 'http://localhost:8000',
        },
        tags: { endpoint: 'login' }, // Tag khusus untuk memisahkan metrik di laporan akhir
    };

    const response = http.post(`${BASE_URL}/auth/login`, payload, params);

    check(response, {
        'login: status 200': (r) => r.status === 200,
        'login: returns token or cookie': (r) => r.status === 200 && r.body.length > 0,
    });

    // Think time dinamis 1 - 2 detik agar trafik tidak menumpuk di milidetik yang sama
    sleep(Math.random() + 1);
}