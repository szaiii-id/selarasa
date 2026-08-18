<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;

// Gunakan RefreshDatabase agar database selalu bersih sebelum tiap test berjalan
uses(RefreshDatabase::class);

beforeEach(function () {
    // Siapkan user dengan berbagai role untuk testing
    $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $this->manager = User::factory()->create(['role' => 'manager', 'is_active' => true]);
    $this->cashier = User::factory()->create(['role' => 'cashier', 'is_active' => true]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

it('returns correct JSON schema structure for user list (API Contract)', function () {
    Sanctum::actingAs($this->admin);
    
    User::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/backoffice/users');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'username',
                    'role',
                    'is_active',
                    'joined_at' // Memastikan format Resource tidak berubah tiba-tiba
                ]
            ],
            'links', // Paginasi bawaan Laravel
            'meta'
        ]);
});

it('returns correct JSON format when creating a user (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'name' => 'John Doe',
        'username' => 'johndoe_api',
        'password' => 'Password123!',
        'role' => 'cashier',
        'is_active' => true
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    $response->assertStatus(Response::HTTP_CREATED)
        ->assertJson([
            'message' => 'User created successfully.',
            'data' => [
                'name' => 'John Doe',
                'username' => 'johndoe_api',
                'role' => 'cashier'
            ]
        ]);
});


// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

it('prevents unauthenticated users from accessing the API (Security)', function () {
    // Tanpa Sanctum::actingAs()
    $response = $this->getJson('/api/v1/backoffice/users');
    
    $response->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('prevents cashiers from accessing the backoffice user management (Authorization)', function () {
    Sanctum::actingAs($this->cashier); // Login sebagai Kasir
    
    $response = $this->getJson('/api/v1/backoffice/users');
    
    // Middleware CheckRole harus melempar 403 Forbidden
    $response->assertStatus(Response::HTTP_FORBIDDEN);
});

it('prevents manager from elevating a new user to admin role (Privilege Escalation Guard)', function () {
    Sanctum::actingAs($this->manager); // Login sebagai Manager

    $payload = [
        'name' => 'Sneaky User',
        'username' => 'sneaky_admin',
        'password' => 'Password123!',
        'role' => 'admin', // Manager mencoba membuat Admin!
        'is_active' => true
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    // FormRequest harus menggagalkan validasi ini
    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['role']);
        
    expect($response->json('errors.role.0'))->toBe('Only administrators can create users with the admin role.');
});


// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

it('successfully transitions user state from active to inactive', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create(['is_active' => true]);

    $response = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson(['message' => 'User has been deactivated successfully.']);

    // Pastikan di database statusnya benar-benar berubah (Data Integrity)
    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'is_active' => false
    ]);
});

it('enforces unique username constraints in database (Data Integrity)', function () {
    Sanctum::actingAs($this->admin);
    
    // Admin sudah punya username 'admin' (tergantung factory Anda)
    $existingUsername = $this->admin->username;

    $payload = [
        'name' => 'Copycat',
        'username' => $existingUsername, // Mencoba pakai username yang sudah ada
        'password' => 'Password123!',
        'role' => 'cashier'
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['username']);
});


// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

it('behaves idempotently when deactivating an already inactive user', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create(['is_active' => false]); // Sudah nonaktif dari awal

    // Ditembak berulang kali
    $response1 = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");
    $response2 = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");

    // Tetap mengembalikan 200 OK dan tidak crash (Sifat Idempotent)
    $response1->assertStatus(Response::HTTP_OK);
    $response2->assertStatus(Response::HTTP_OK);

    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'is_active' => false
    ]);
});

it('returns 404 when trying to delete a user that has already been deleted', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create();

    // Hapus pertama kali (Berhasil)
    $this->deleteJson("/api/v1/backoffice/users/{$targetUser->id}")
        ->assertStatus(Response::HTTP_NO_CONTENT);

    // Hapus kedua kali (Idempotent Hard Delete -> 404 Not Found)
    $this->deleteJson("/api/v1/backoffice/users/{$targetUser->id}")
        ->assertStatus(Response::HTTP_NOT_FOUND);
});


// ==========================================
// 5. RATE LIMITING & THROTTLING
// ==========================================

it('blocks user after too many requests (Rate Limiting)', function () {
    Sanctum::actingAs($this->admin);

    // Asumsi throttle:api membatasi 60 request per menit
    // Kita tembak endpoint 61 kali.
    for ($i = 1; $i <= 60; $i++) {
        $this->getJson('/api/v1/backoffice/users');
    }

    // Request ke-61 harus ditolak dengan 429 Too Many Requests
    $response = $this->getJson('/api/v1/backoffice/users');
    $response->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);
});