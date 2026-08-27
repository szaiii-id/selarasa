<?php

use App\Models\CashierShift;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create users with different roles (PIN: 6 characters)
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
        'username' => 'admin_test',
        'pin_code' => Hash::make('123456'),
    ]);
    
    $this->manager = User::factory()->create([
        'role' => 'manager',
        'is_active' => true,
        'username' => 'manager_test',
        'pin_code' => Hash::make('123456'),
    ]);
    
    $this->cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
        'username' => 'cashier_test',
        'pin_code' => Hash::make('123456'),
    ]);
    
    $this->cashier2 = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
        'username' => 'cashier2_test',
        'pin_code' => Hash::make('567890'),
    ]);
    
    $this->inventory = User::factory()->create([
        'role' => 'inventory',
        'is_active' => true,
        'username' => 'inventory_test',
        'pin_code' => Hash::make('123456'),
    ]);
    
    // Create shift master data
    $this->morningShift = Shift::factory()->create([
        'name' => 'Morning Shift',
        'start_time' => '08:00:00',
        'end_time' => '16:00:00',
        'is_active' => true,
    ]);
    
    $this->eveningShift = Shift::factory()->create([
        'name' => 'Evening Shift',
        'start_time' => '16:00:00',
        'end_time' => '23:59:00',
        'is_active' => true,
    ]);
    
    // Create an open cashier shift for testing
    $this->openCashierShift = CashierShift::factory()->create([
        'user_id' => $this->cashier->id,
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'status' => CashierShift::STATUS_OPEN,
        'started_at' => now()->subHours(4),
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

it('returns correct JSON schema for current active shift (API Contract)', function () {
    Sanctum::actingAs($this->cashier);

    $response = $this->getJson('/api/v1/pos/shifts/current');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'user_id',
                'shift_id',
                'opening_balance',
                'closing_balance',
                'expected_balance',
                'variance',
                'status',
                'started_at',
                'ended_at',
                'notes',
            ]
        ])
        ->assertJson([
            'message' => 'Active shift session retrieved successfully.',
            'data' => [
                'id' => $this->openCashierShift->id,
                'status' => CashierShift::STATUS_OPEN,
            ]
        ]);
});

it('returns correct JSON schema when no active shift (API Contract)', function () {
    Sanctum::actingAs($this->cashier2); // cashier2 has no active shift

    $response = $this->getJson('/api/v1/pos/shifts/current');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'message' => 'No active shift session found.',
            'data' => null
        ]);
});

it('returns correct JSON schema when starting a shift (API Contract)', function () {
    Sanctum::actingAs($this->cashier2);

    $payload = [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 150000,
        'pin_code' => '567890',
        'notes' => 'Evening shift start'
    ];

    $response = $this->postJson('/api/v1/pos/shifts/start', $payload);

    $response->assertStatus(Response::HTTP_CREATED)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'user_id',
                'shift_id',
                'opening_balance',
                'status',
                'started_at',
                'notes',
            ]
        ])
        ->assertJson([
            'message' => 'Shift session started successfully.',
            'data' => [
                'user_id' => $this->cashier2->id,
                'shift_id' => $this->eveningShift->id,
                'opening_balance' => 150000,
                'status' => CashierShift::STATUS_OPEN,
            ]
        ]);
});

it('returns correct JSON schema when closing a shift (API Contract)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => 150000,
        'expected_balance' => 150000,
        'pin_code' => '123456',
        'notes' => 'Shift closed normally'
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'user_id',
                'shift_id',
                'opening_balance',
                'closing_balance',
                'expected_balance',
                'variance',
                'status',
                'started_at',
                'ended_at',
                'notes',
            ]
        ])
        ->assertJson([
            'message' => 'Shift session closed successfully.',
            'data' => [
                'id' => $this->openCashierShift->id,
                'status' => CashierShift::STATUS_CLOSED,
                'variance' => 0,
            ]
        ]);
});

it('returns correct JSON schema when handing over shift (API Contract)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'to_user_id' => $this->cashier2->id,
        'pin_code' => '123456',
        'to_user_pin' => '567890',
        'amount_counted' => 150000,
        'notes' => 'Emergency handover'
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/handover", $payload);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'user_id',
                'shift_id',
                'opening_balance',
                'status',
                'started_at',
                'notes',
            ]
        ])
        ->assertJson([
            'message' => 'Shift session handed over successfully.',
            'data' => [
                'id' => $this->openCashierShift->id,
                'user_id' => $this->cashier2->id, // Ownership transferred
                'status' => CashierShift::STATUS_OPEN,
            ]
        ]);
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

it('prevents unauthenticated users from accessing POS shift endpoints (Security)', function () {
    $this->getJson('/api/v1/pos/shifts/current')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
    
    $this->postJson('/api/v1/pos/shifts/start', [
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '123456',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('prevents inventory from accessing POS shift endpoints (Authorization)', function () {
    Sanctum::actingAs($this->inventory);
    
    $this->getJson('/api/v1/pos/shifts/current')
        ->assertStatus(Response::HTTP_FORBIDDEN);
    
    $this->postJson('/api/v1/pos/shifts/start', [
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '123456',
    ])->assertStatus(Response::HTTP_FORBIDDEN);
});

it('allows admin to access POS shift endpoints (Authorization)', function () {
    Sanctum::actingAs($this->admin);
    
    $this->getJson('/api/v1/pos/shifts/current')
        ->assertStatus(Response::HTTP_OK);
});

it('allows manager to access POS shift endpoints (Authorization)', function () {
    Sanctum::actingAs($this->manager);
    
    $this->getJson('/api/v1/pos/shifts/current')
        ->assertStatus(Response::HTTP_OK);
});

it('prevents inactive cashier from accessing POS shift endpoints (Security)', function () {
    $inactiveCashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => false,
        'pin_code' => Hash::make('123456'),
    ]);
    
    Sanctum::actingAs($inactiveCashier);
    
    $this->getJson('/api/v1/pos/shifts/current')
        ->assertStatus(Response::HTTP_FORBIDDEN);
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

it('successfully starts a new shift session (State Transition)', function () {
    Sanctum::actingAs($this->cashier2);

    $payload = [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 200000,
        'pin_code' => '567890',
        'notes' => 'Starting evening shift'
    ];

    $response = $this->postJson('/api/v1/pos/shifts/start', $payload);

    $response->assertStatus(Response::HTTP_CREATED);
    
    $this->assertDatabaseHas('cashier_shifts', [
        'user_id' => $this->cashier2->id,
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 200000,
        'status' => CashierShift::STATUS_OPEN,
        'notes' => 'Starting evening shift',
    ]);
});

it('successfully closes an open shift with zero variance (State Transition)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
        'notes' => 'Balanced shift'
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'status' => CashierShift::STATUS_CLOSED,
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'variance' => 0,
        'notes' => 'Balanced shift',
    ]);
});

it('calculates positive variance when closing balance exceeds expected (Data Integrity)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => 120000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
        'notes' => 'Cash overage'
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'variance' => 20000,
    ]);
});

it('calculates negative variance when closing balance is less than expected (Data Integrity)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => 80000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
        'notes' => 'Cash shortage'
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'variance' => -20000,
    ]);
});

it('successfully hands over shift and creates handover record (State Transition)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'to_user_id' => $this->cashier2->id,
        'pin_code' => '123456',
        'to_user_pin' => '567890',
        'amount_counted' => 150000,
        'notes' => 'Shift handover due to emergency'
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/handover", $payload);

    $response->assertStatus(Response::HTTP_OK);
    
    // Verify ownership transferred
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'user_id' => $this->cashier2->id,
        'status' => CashierShift::STATUS_OPEN,
    ]);
    
    // Verify handover record created
    $this->assertDatabaseHas('cashier_shift_handovers', [
        'cashier_shift_id' => $this->openCashierShift->id,
        'from_user_id' => $this->cashier->id,
        'to_user_id' => $this->cashier2->id,
        'amount_counted' => 150000,
        'notes' => 'Shift handover due to emergency',
    ]);
});

// ==========================================
// 4. VALIDATION & ERROR HANDLING
// ==========================================

it('prevents starting shift with invalid PIN (Security)', function () {
    Sanctum::actingAs($this->cashier2);

    $payload = [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '999999', // Wrong PIN
    ];

    $response = $this->postJson('/api/v1/pos/shifts/start', $payload);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Invalid PIN code. Access denied.'
        ]);
});

it('prevents closing shift with invalid PIN (Security)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'pin_code' => '999999', // Wrong PIN
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Invalid PIN code. Access denied.'
        ]);
});

it('handles validation error when starting shift without required fields', function () {
    Sanctum::actingAs($this->cashier2);

    $response = $this->postJson('/api/v1/pos/shifts/start', []);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['shift_id', 'opening_balance', 'pin_code']);
});

it('handles validation error when closing shift with negative balance', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => -1000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['closing_balance']);
});

it('handles validation error when PIN is not 6 characters', function () {
    Sanctum::actingAs($this->cashier2);

    $response = $this->postJson('/api/v1/pos/shifts/start', [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '1234', // Only 4 characters
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['pin_code']);
});

// ==========================================
// 5. BUSINESS RULE ENFORCEMENT
// ==========================================

it('prevents starting a new shift when one is already active (Business Rule)', function () {
    Sanctum::actingAs($this->cashier); // Already has active shift

    $payload = [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '123456',
    ];

    $response = $this->postJson('/api/v1/pos/shifts/start', $payload);

    $response->assertStatus(Response::HTTP_CONFLICT)
        ->assertJson([
            'message' => 'You already have an active shift session. Please close it before starting a new one.'
        ]);
});

it('prevents handing over shift to yourself (Business Rule)', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'to_user_id' => $this->cashier->id, // Same user
        'pin_code' => '123456',
        'to_user_pin' => '123456',
        'amount_counted' => 100000,
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/handover", $payload);

    $response->assertStatus(Response::HTTP_CONFLICT)
        ->assertJson([
            'message' => 'Cannot hand over a shift to yourself.'
        ]);
});

it('prevents handing over to cashier with existing active shift (Business Rule)', function () {
    // Create active shift for cashier2
    CashierShift::factory()->create([
        'user_id' => $this->cashier2->id,
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 100000,
        'status' => CashierShift::STATUS_OPEN,
        'started_at' => now()->subHours(2),
    ]);
    
    Sanctum::actingAs($this->cashier);

    $payload = [
        'to_user_id' => $this->cashier2->id,
        'pin_code' => '123456',
        'to_user_pin' => '567890',
        'amount_counted' => 100000,
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/handover", $payload);

    $response->assertStatus(Response::HTTP_CONFLICT)
        ->assertJson([
            'message' => 'The selected cashier already has an active shift session and cannot receive a handover.'
        ]);
});

it('prevents closing shift that belongs to another cashier (Authorization)', function () {
    Sanctum::actingAs($this->cashier2); // Different cashier

    $payload = [
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'pin_code' => '567890',
    ];

    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Unauthorized action: You cannot close a shift session that belongs to another cashier.'
        ]);
});

// ==========================================
// 6. IDEMPOTENCY TESTING
// ==========================================

it('returns 404 when closing already closed shift (Idempotency)', function () {
    Sanctum::actingAs($this->cashier);

    // Close the shift first
    $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", [
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
    ])->assertStatus(Response::HTTP_OK);

    // Try to close again
    $response = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", [
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
    ]);

    $response->assertStatus(Response::HTTP_NOT_FOUND);
});

it('returns 404 when handing over non-existent shift (Idempotency)', function () {
    Sanctum::actingAs($this->cashier);

    $nonExistentId = 99999;
    
    $response = $this->postJson("/api/v1/pos/shifts/{$nonExistentId}/handover", [
        'to_user_id' => $this->cashier2->id,
        'pin_code' => '123456',
        'to_user_pin' => '567890',
        'amount_counted' => 100000,
    ]);

    $response->assertStatus(Response::HTTP_NOT_FOUND);
});

// ==========================================
// 7. CONCURRENCY / RACE CONDITION
// ==========================================

it('handles concurrent close requests safely', function () {
    Sanctum::actingAs($this->cashier);

    $payload = [
        'closing_balance' => 100000,
        'expected_balance' => 100000,
        'pin_code' => '123456',
    ];

    // Simulate concurrent close requests
    $responses = [];
    for ($i = 0; $i < 2; $i++) {
        $responses[] = $this->postJson("/api/v1/pos/shifts/{$this->openCashierShift->id}/close", $payload);
    }

    // One should succeed (200), one should fail (404)
    $successCount = 0;
    $notFoundCount = 0;
    
    foreach ($responses as $response) {
        if ($response->getStatusCode() === Response::HTTP_OK) {
            $successCount++;
        } elseif ($response->getStatusCode() === Response::HTTP_NOT_FOUND) {
            $notFoundCount++;
        }
    }

    expect($successCount)->toBe(1);
    expect($notFoundCount)->toBe(1);
    
    // Final state should be closed
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'status' => CashierShift::STATUS_CLOSED,
    ]);
});

it('handles concurrent start requests safely', function () {
    Sanctum::actingAs($this->cashier2);

    $payload = [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '567890',
    ];

    // Simulate concurrent start requests
    $responses = [];
    for ($i = 0; $i < 2; $i++) {
        $responses[] = $this->postJson('/api/v1/pos/shifts/start', $payload);
    }

    // One should succeed (201), one should fail (409)
    $createdCount = 0;
    $conflictCount = 0;
    
    foreach ($responses as $response) {
        if ($response->getStatusCode() === Response::HTTP_CREATED) {
            $createdCount++;
        } elseif ($response->getStatusCode() === Response::HTTP_CONFLICT) {
            $conflictCount++;
        }
    }

    expect($createdCount)->toBe(1);
    expect($conflictCount)->toBe(1);
    
    // Only one active shift should exist
    $activeShifts = CashierShift::where('user_id', $this->cashier2->id)
        ->where('status', CashierShift::STATUS_OPEN)
        ->count();
    expect($activeShifts)->toBe(1);
});

// ==========================================
// 8. PERFORMANCE TESTING
// ==========================================

it('responds within acceptable time for current shift check', function () {
    Sanctum::actingAs($this->cashier);

    $startTime = microtime(true);
    
    $response = $this->getJson('/api/v1/pos/shifts/current');
    
    $endTime = microtime(true);
    $responseTime = ($endTime - $startTime) * 1000;

    $response->assertStatus(Response::HTTP_OK);
    
    expect($responseTime)->toBeLessThan(500);
});

it('start shift endpoint responds within acceptable time', function () {
    Sanctum::actingAs($this->cashier2);

    $payload = [
        'shift_id' => $this->eveningShift->id,
        'opening_balance' => 100000,
        'pin_code' => '567890',
    ];

    $startTime = microtime(true);
    
    $response = $this->postJson('/api/v1/pos/shifts/start', $payload);
    
    $endTime = microtime(true);
    $responseTime = ($endTime - $startTime) * 1000;

    $response->assertStatus(Response::HTTP_CREATED);
    
    expect($responseTime)->toBeLessThan(500);
});