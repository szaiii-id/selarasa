import http from 'k6/http';
import { check, sleep } from 'k6';

// ==========================================
// 1. CONFIGURATION & THRESHOLDS
// ==========================================
export const options = {
    stages: [
        { duration: '10s', target: 20 }, // Ramp-up to 20 Virtual Users (VUs)
        { duration: '30s', target: 20 }, // Hold at 20 VUs for 30 seconds
        { duration: '10s', target: 0 },  // Ramp-down to 0 VUs
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
    },
};

// ==========================================
// 2. TEST SCENARIO
// ==========================================
export default function () {
    const url = 'http://localhost:8000/api/v1/auth/login';

    // Using credentials matching the UserSeeder (username: admin, password: selarasa01)
    const payload = JSON.stringify({
        username: 'admin',
        password: 'selarasa01',
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    };

    const response = http.post(url, payload, params);

    // ==========================================
    // 3. ASSERTIONS (CHECKS)
    // ==========================================
    const success = check(response, {
        'is status 200': (r) => r.status === 200,
        'has valid json response': (r) => {
            try {
                return r.json('message') === 'Login Successful.';
            } catch (e) {
                return false;
            }
        },
        'has token': (r) => {
            try {
                return r.json('data.token') !== undefined;
            } catch (e) {
                return false;
            }
        },
    });

    // Debug log if request fails
    if (!success) {
        console.log(`[Status: ${response.status}] Body: ${response.body}`);
    }

    sleep(1);
}