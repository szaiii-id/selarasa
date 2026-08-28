<?php

use App\Models\CashierShift;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create users with different roles
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
        'username' => 'admin_test'
    ]);
    
    $this->manager = User::factory()->create([
        'role' => 'manager',
        'is_active' => true,
        'username' => 'manager_test'
    ]);
    
    $this->cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
        'username' => 'cashier_test'
    ]);
    
    $this->inventory = User::factory()->create([
        'role' => 'inventory',
        'is_active' => true,
        'username' => 'inventory_test'
    ]);
    
    $this->cashier2 = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
        'username' => 'cashier2_test'
    ]);
    
    // Create shift master data
    $this->morningShift = Shift::factory()->create([
        'name' => 'Morning Shift',
        'start_time' => '08:00:00',
        'end_time' => '16:00:00',
        'is_active' => true,
    ]);
    
    // Create open cashier shift
    $this->openCashierShift = CashierShift::factory()->create([
        'user_id' => $this->cashier->id,
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'status' => CashierShift::STATUS_OPEN,
        'started_at' => now()->subHours(4),
    ]);
    
    // Create closed cashier shift (normal close)
    $this->closedCashierShift = CashierShift::factory()->closed()->create([
        'user_id' => $this->cashier->id,
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'started_at' => now()->subDays(1)->subHours(4),
        'ended_at' => now()->subDays(1),
    ]);
    
    // Create force closed shift
    $this->forceClosedShift = CashierShift::factory()->forceClosed()->create([
        'user_id' => $this->cashier->id,
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'started_at' => now()->subDays(2)->subHours(4),
    ]);
    
    // Create shift with variance
    $this->varianceShift = CashierShift::factory()->withVariance(-15000)->create([
        'user_id' => $this->cashier2->id,
        'shift_id' => $this->morningShift->id,
        'opening_balance' => 100000,
        'started_at' => now()->subDays(3)->subHours(4),
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

it('returns correct JSON schema for cashier shift history (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->getJson('/api/v1/backoffice/cashier-shifts');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'data' => [
                '*' => [
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
            ],
            'links',
            'meta'
        ]);
});

it('returns correct JSON schema for force close endpoint (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 100000,
        'closing_balance' => 90000,
        'notes' => 'Force close test'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        $payload
    );

    // Debug: uncomment to see actual response structure
    // dd($response->json());

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
            'message' => 'Shift has been forcefully closed by manager.',
        ]);
});

it('returns paginated results with correct meta (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    // Create additional closed shifts
    CashierShift::factory()->closed()->count(20)->create([
        'user_id' => $this->cashier->id,
        'shift_id' => $this->morningShift->id,
        'started_at' => now()->subDays(4),
        'ended_at' => now()->subDays(4)->addHours(8),
    ]);

    $response = $this->getJson('/api/v1/backoffice/cashier-shifts?per_page=10&page=1');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(10, 'data')
        ->assertJsonStructure([
            'data',
            'links' => [
                'first',
                'last',
                'prev',
                'next',
            ],
            'meta' => [
                'current_page',
                'from',
                'last_page',
                'path',
                'per_page',
                'to',
                'total',
            ]
        ]);
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

it('prevents unauthenticated users from accessing cashier shift history (Security)', function () {
    $this->getJson('/api/v1/backoffice/cashier-shifts')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('prevents unauthenticated users from force closing shifts (Security)', function () {
    $this->postJson("/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close", [
        'expected_balance' => 100000,
        'notes' => 'Test'
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('prevents cashiers from accessing backoffice cashier shift history (Authorization)', function () {
    Sanctum::actingAs($this->cashier);
    
    $this->getJson('/api/v1/backoffice/cashier-shifts')
        ->assertStatus(Response::HTTP_FORBIDDEN);
});

it('prevents cashiers from force closing shifts (Authorization)', function () {
    Sanctum::actingAs($this->cashier);
    
    $this->postJson("/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close", [
        'expected_balance' => 100000,
        'notes' => 'Test'
    ])->assertStatus(Response::HTTP_FORBIDDEN);
});

it('prevents inventory from accessing cashier shift management (Authorization)', function () {
    Sanctum::actingAs($this->inventory);
    
    $this->getJson('/api/v1/backoffice/cashier-shifts')
        ->assertStatus(Response::HTTP_FORBIDDEN);
    
    $this->postJson("/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close", [
        'expected_balance' => 100000,
        'notes' => 'Test'
    ])->assertStatus(Response::HTTP_FORBIDDEN);
});

it('allows admin to access and force close shifts (Authorization)', function () {
    Sanctum::actingAs($this->admin);
    
    $this->getJson('/api/v1/backoffice/cashier-shifts')
        ->assertStatus(Response::HTTP_OK);
    
    $this->postJson("/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close", [
        'expected_balance' => 100000,
        'closing_balance' => 90000,
        'notes' => 'Admin force close'
    ])->assertStatus(Response::HTTP_OK);
});

it('allows manager to access and force close shifts (Authorization)', function () {
    Sanctum::actingAs($this->manager);
    
    $this->getJson('/api/v1/backoffice/cashier-shifts')
        ->assertStatus(Response::HTTP_OK);
    
    $this->postJson("/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close", [
        'expected_balance' => 100000,
        'closing_balance' => 90000,
        'notes' => 'Manager force close'
    ])->assertStatus(Response::HTTP_OK);
});

it('prevents inactive admin from accessing cashier shift endpoints (Security)', function () {
    $inactiveAdmin = User::factory()->create([
        'role' => 'admin',
        'is_active' => false,
    ]);
    
    Sanctum::actingAs($inactiveAdmin);
    
    $this->getJson('/api/v1/backoffice/cashier-shifts')
        ->assertStatus(Response::HTTP_FORBIDDEN);
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

it('successfully force closes an open shift (State Transition)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 100000,
        'closing_balance' => 85000,
        'notes' => 'Cash register shortage'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_OK);
    
    // Verify shift is closed
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'status' => CashierShift::STATUS_CLOSED,
        'closing_balance' => 85000,
        'expected_balance' => 100000,
        'variance' => -15000,
        'closed_by_user_id' => $this->admin->id,
    ]);
});

it('calculates positive variance correctly on force close (Data Integrity)', function () {
    Sanctum::actingAs($this->manager);

    $payload = [
        'expected_balance' => 100000,
        'closing_balance' => 120000,
        'notes' => 'Cash overage'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'variance' => 20000,
    ]);
});

it('uses expected balance as closing balance when closing balance is missing (Data Integrity)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 100000,
        'notes' => 'No closing balance provided'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'closing_balance' => 100000,
        'variance' => 0,
    ]);
});

it('adds FORCE CLOSED BY MANAGER prefix to notes (Data Integrity)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 100000,
        'closing_balance' => 100000,
        'notes' => 'Emergency situation'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_OK);
    
    $shift = CashierShift::find($this->openCashierShift->id);
    expect($shift->notes)->toContain('FORCE CLOSED BY MANAGER:');
    expect($shift->notes)->toContain('Emergency situation');
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

it('returns error when force closing an already closed shift (Idempotency)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 150000,
        'closing_balance' => 150000,
        'notes' => 'Attempt to close again'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->closedCashierShift->id}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_CONFLICT)
        ->assertJson([
            'message' => 'Shift session is already closed or not found.'
        ]);
});

it('returns error when force closing a force-closed shift (Idempotency)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 150000,
        'closing_balance' => 150000,
        'notes' => 'Attempt to close force-closed shift'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->forceClosedShift->id}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_CONFLICT);
});

it('returns error when force closing non-existent shift (Idempotency)', function () {
    Sanctum::actingAs($this->admin);

    $nonExistentId = 99999;
    $payload = [
        'expected_balance' => 100000,
        'notes' => 'Test non-existent'
    ];

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$nonExistentId}/force-close",
        $payload
    );

    $response->assertStatus(Response::HTTP_CONFLICT);
});

// ==========================================
// 5. VALIDATION & ERROR HANDLING
// ==========================================

it('handles validation error when expected balance is missing', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        [
            'notes' => 'Missing expected balance'
        ]
    );

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['expected_balance']);
});

it('handles validation error when expected balance is negative', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        [
            'expected_balance' => -1000,
            'notes' => 'Negative balance'
        ]
    );

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['expected_balance']);
});

it('handles validation error when closing balance is negative', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        [
            'expected_balance' => 100000,
            'closing_balance' => -5000,
            'notes' => 'Negative closing balance'
        ]
    );

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['closing_balance']);
});

it('handles validation error when notes exceed max length', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        [
            'expected_balance' => 100000,
            'notes' => str_repeat('a', 501), // 501 characters, max is 500
        ]
    );

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['notes']);
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

it('handles concurrent force close requests safely', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 100000,
        'closing_balance' => 90000,
        'notes' => 'Concurrent force close'
    ];

    // Simulate concurrent force close requests
    $responses = [];
    for ($i = 0; $i < 2; $i++) {
        $responses[] = $this->postJson(
            "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
            $payload
        );
    }

    // One should succeed, one should fail (409 Conflict)
    $successCount = 0;
    $conflictCount = 0;
    
    foreach ($responses as $response) {
        if ($response->getStatusCode() === Response::HTTP_OK) {
            $successCount++;
        } elseif ($response->getStatusCode() === Response::HTTP_CONFLICT) {
            $conflictCount++;
        }
    }

    expect($successCount)->toBe(1);
    expect($conflictCount)->toBe(1);
    
    // Final state should be closed
    $this->assertDatabaseHas('cashier_shifts', [
        'id' => $this->openCashierShift->id,
        'status' => CashierShift::STATUS_CLOSED,
    ]);
});

// ==========================================
// 7. FILTER & SEARCH TESTING
// ==========================================

it('filters cashier shifts by open status (Filter)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->getJson('/api/v1/backoffice/cashier-shifts?status=' . CashierShift::STATUS_OPEN);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(1, 'data')
        ->assertJsonFragment([
            'status' => CashierShift::STATUS_OPEN,
        ]);
});

it('filters cashier shifts by closed status (Filter)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->getJson('/api/v1/backoffice/cashier-shifts?status=' . CashierShift::STATUS_CLOSED);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(3, 'data'); // closed + forceClosed + varianceShift
});

it('filters cashier shifts by user (Filter)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->getJson('/api/v1/backoffice/cashier-shifts?user_id=' . $this->cashier->id);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(3, 'data'); // open + closed + forceClosed
});

it('filters cashier shifts by date (Filter)', function () {
    Sanctum::actingAs($this->admin);

    $today = now()->toDateString();
    
    $response = $this->getJson('/api/v1/backoffice/cashier-shifts?date=' . $today);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(1, 'data') // Only the open shift from today
        ->assertJsonFragment([
            'id' => $this->openCashierShift->id,
        ]);
});

it('filters cashier shifts by date range (Filter)', function () {
    Sanctum::actingAs($this->admin);

    $fromDate = now()->subDays(2)->toDateString();
    $toDate = now()->toDateString();
    
    $response = $this->getJson(
        '/api/v1/backoffice/cashier-shifts?date_from=' . $fromDate . '&date_to=' . $toDate
    );

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(3, 'data'); // open (today) + forceClosed (2 days ago) + varianceShift (3 days ago)
});

// ==========================================
// 8. PERFORMANCE TESTING
// ==========================================

it('responds within acceptable time for cashier shift history', function () {
    Sanctum::actingAs($this->admin);

    $startTime = microtime(true);
    
    $response = $this->getJson('/api/v1/backoffice/cashier-shifts');
    
    $endTime = microtime(true);
    $responseTime = ($endTime - $startTime) * 1000;

    $response->assertStatus(Response::HTTP_OK);
    
    expect($responseTime)->toBeLessThan(500);
});

it('force close endpoint responds within acceptable time', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'expected_balance' => 100000,
        'closing_balance' => 100000,
        'notes' => 'Performance test'
    ];

    $startTime = microtime(true);
    
    $response = $this->postJson(
        "/api/v1/backoffice/cashier-shifts/{$this->openCashierShift->id}/force-close",
        $payload
    );
    
    $endTime = microtime(true);
    $responseTime = ($endTime - $startTime) * 1000;

    $response->assertStatus(Response::HTTP_OK);
    
    expect($responseTime)->toBeLessThan(500);
});