<?php

use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\BackOffice\Auth\LoginController as BackOfficeLoginController;
use App\Http\Controllers\Api\V1\BackOffice\Shift\ShiftController;
use App\Http\Controllers\Api\V1\BackOffice\Shift\CashierShiftController as BackOfficeCashierShiftController;
use App\Http\Controllers\Api\V1\BackOffice\User\UserController;
use App\Http\Controllers\Api\V1\Pos\Auth\LoginController as PosLoginController;
use App\Http\Controllers\Api\V1\Pos\Shift\CashierShiftController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| K6 / Load Testing Routes (No Throttle)
|--------------------------------------------------------------------------
| Rute ini didaftarkan khusus di lingkungan non-production melalui
| bootstrap/app.php dengan prefix '/api-test/v1'.
*/

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | 1. PUBLIC AUTHENTICATION ROUTES (Load Testing)
    |--------------------------------------------------------------------------
    | Separate login endpoints for Back-Office and POS testing.
    | (URL disamakan persis dengan PROD, tanpa middleware throttle)
    */
    Route::post('/backoffice/auth/login', BackOfficeLoginController::class)
        ->name('test.v1.backoffice.auth.login');
    
    Route::post('/pos/auth/login', PosLoginController::class)
        ->name('test.v1.pos.auth.login');

    /*
    |--------------------------------------------------------------------------
    | 2. PROTECTED SHARED AUTH ROUTES
    |--------------------------------------------------------------------------
    | (Tanpa throttle:api, hanya auth:sanctum dan active)
    */
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        
        Route::prefix('auth')->group(function () {
            Route::get('/me', MeController::class)->name('test.v1.auth.me');
            Route::post('/logout', LogoutController::class)->name('test.v1.auth.logout');
        });

    });

    /*
    |--------------------------------------------------------------------------
    | 3. PROTECTED BACK-OFFICE ROUTES (Load Testing)
    |--------------------------------------------------------------------------
    | Main Back-Office Gateway tanpa throttle.
    | Role guard tetap dipertahankan untuk memastikan otorisasi berjalan normal.
    */
    Route::middleware(['auth:sanctum', 'active', 'role:admin,manager,inventory'])
        ->prefix('backoffice')
        ->group(function () {

        /*
        |----------------------------------------------------------------------
        | HR & OPERATIONS RESTRICTED AREA (Admin & Manager only)
        |----------------------------------------------------------------------
        */
        Route::middleware(['role:admin,manager'])->group(function () {
            
            // ==========================================
            // USER MANAGEMENT MODULE (HR)
            // ==========================================
            Route::prefix('users')->name('test.v1.backoffice.users.')->group(function () {
                Route::patch('/{user}/deactivate', [UserController::class, 'deactivate'])
                    ->name('deactivate');
                Route::patch('/{user}/activate', [UserController::class, 'activate'])
                    ->name('activate');
            });

            Route::apiResource('users', UserController::class)
                ->names('test.v1.backoffice.users');

            // ==========================================
            // SHIFT MANAGEMENT (MASTER DATA)
            // ==========================================
            Route::prefix('shifts')->name('test.v1.backoffice.shifts.')->group(function () {
                // Custom route for dropdowns (must be placed before apiResource)
                Route::get('/active', [ShiftController::class, 'active'])
                    ->name('active');
            });
            
            Route::apiResource('shifts', ShiftController::class)
                ->names('test.v1.backoffice.shifts');

            // ==========================================
            // CASHIER SHIFT MONITORING & FORCE CLOSE
            // ==========================================
            Route::prefix('cashier-shifts')->name('test.v1.backoffice.cashier-shifts.')->group(function () {
                Route::get('/', [BackOfficeCashierShiftController::class, 'index'])
                    ->name('index');
                Route::post('/{id}/force-close', [BackOfficeCashierShiftController::class, 'forceClose'])
                    ->name('force-close');
            });

        });

    });

    /*
    |--------------------------------------------------------------------------
    | 4. PROTECTED POS ROUTES (Load Testing)
    |--------------------------------------------------------------------------
    | Main POS Gateway tanpa throttle.
    | Role guard tetap dipertahankan.
    */
    Route::middleware(['auth:sanctum', 'active', 'role:admin,manager,cashier'])
        ->prefix('pos')
        ->group(function () {

        /*
        |----------------------------------------------------------------------
        | CASHIER SHIFT SESSION MODULE
        |----------------------------------------------------------------------
        */
        Route::prefix('shifts')->name('test.v1.pos.shifts.')->group(function () {
            
            Route::get('/current', [CashierShiftController::class, 'current'])
                ->name('current');
            Route::post('/start', [CashierShiftController::class, 'start'])
                ->name('start');
            Route::post('/{id}/close', [CashierShiftController::class, 'close'])
                ->name('close');
            Route::post('/{id}/handover', [CashierShiftController::class, 'handover'])
                ->name('handover');
            
        });

    });

});