import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate, Trend } from 'k6/metrics';

const csrfSuccessRate = new Rate('csrf_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const startShiftSuccessRate = new Rate('start_shift_success_rate');
const conflictRate = new Rate('conflict_rate');
const csrfDuration = new Trend('csrf_duration', true);
const loginDuration = new Trend('login_duration', true);
const startShiftDuration = new Trend('start_shift_duration', true);

export const options = {
    scenarios: {
        spike_start_shift: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 50 },
                { duration: '30s', target: 100 },
                { duration: '1m', target: 100 },
                { duration: '10s', target: 0 },
            ],
            gracefulStop: '30s',
        },
    },
    thresholds: {
        // ✅ PERTAHANKAN: Performance threshold
        'http_req_duration{type:start_shift}': ['p(95)<500'],
        
        
        // ✅ TAMBAHKAN: Threshold yang benar untuk validasi bisnis
        'start_shift_success_rate': ['rate>0.01'], // Minimal 1% sukses (100 dari 2534)
        'conflict_rate': ['rate<0.99'], // Maksimal 99% conflict (validasi bekerja)
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';
const PASSWORD = __ENV.TEST_PASSWORD || 'password_testing_123';

const users = new SharedArray('pos cashiers', function () {
    const password = __ENV.TEST_PASSWORD || 'password_testing_123';
    
    return Array.from({ length: 200 }, (_, i) => ({
        username: `cashier_test_${i + 1}`,
        password: password,
        pin_code: '123456',
    }));
});

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
        'User-Agent': 'k6-spike-test',
    };
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
    const loginPayload = JSON.stringify({
        username: user.username,
        password: user.password,
    });
    
    const startTime = Date.now();
    
    let loginRes;
    try {
        loginRes = http.post(
            `${BASE_URL}/api-test/v1/pos/auth/login`,
            loginPayload,
            {
                headers: {
                    ...getBaseHeaders(),
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrfToken,
                },
                jar: jar,
                tags: { type: 'pos_login' },
            }
        );
    } catch (e) {
        return { response: null, success: false };
    }
    
    loginDuration.add(Date.now() - startTime);
    
    const success = loginRes.status === 200;
    loginSuccessRate.add(success);
    
    return { response: loginRes, success };
}

export default function () {
    const user = users[(__VU - 1) % users.length];
    const jar = http.cookieJar();
    
    const csrfResult = performCsrfHandshake(jar);
    if (!csrfResult.success) return;
    
    const loginResult = performLogin(jar, csrfResult.token, user);
    if (!loginResult.success) return;
    
    const refreshResult = performCsrfHandshake(jar);
    if (!refreshResult.success) return;
    
    const authHeaders = {
        ...getBaseHeaders(),
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': refreshResult.token,
    };
    
    const shiftPayload = JSON.stringify({
        shift_id: 1,
        opening_balance: 100000,
        pin_code: user.pin_code,
        notes: 'Spike test shift',
    });
    
    const startTime = Date.now();
    
    const res = http.post(
        `${BASE_URL}/api-test/v1/pos/shifts/start`,
        shiftPayload,
        {
            headers: authHeaders,
            jar: jar,
            tags: { type: 'start_shift' },
        }
    );
    
    startShiftDuration.add(Date.now() - startTime);
    
    const isSuccess = res.status === 201;
    const isConflict = res.status === 409;
    
    startShiftSuccessRate.add(isSuccess);
    conflictRate.add(isConflict);
    
    check(res, {
        'Start shift status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    });
    
    sleep(Math.random() * 3 + 2);
}

export function setup() {
    console.log('=== Spike Test: Start Shift Endpoint ===');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Target VUs: 100`);
    console.log('========================================');
}

export function teardown(data) {
    console.log('\n=== Spike Test Completed ===');
    console.log(`End Time: ${new Date().toISOString()}`);
    console.log('=============================');
}