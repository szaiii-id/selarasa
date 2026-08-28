<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

pest()->extend(TestCase::class)
 // ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
*/

function something()
{
    // ..
}

// ==========================================
// CUSTOM HELPER FUNCTIONS
// ==========================================

function callProtectedMethod($object, string $methodName, array $parameters = [])
{
    $reflection = new ReflectionClass($object);
    $method = $reflection->getMethod($methodName);
    $method->setAccessible(true);
    
    return $method->invokeArgs($object, $parameters);
}

function mockUserWithPin(string $pinCode) {
    $user = Mockery::mock(App\Models\User::class);
    $user->shouldReceive('getAttribute')
        ->with('pin_code')
        ->andReturn($pinCode)
        ->byDefault();
    return $user;
}

function mockCashierShift(array $attributes = []) {
    $shift = Mockery::mock(App\Models\CashierShift::class);
    
    foreach ($attributes as $key => $value) {
        $shift->shouldReceive('getAttribute')
            ->with($key)
            ->andReturn($value)
            ->byDefault();
    }
    
    $shift->shouldReceive('fresh')
        ->andReturnSelf()
        ->byDefault();
    
    return $shift;
}