<?php

use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\BackOffice\Auth\LoginController as BackOfficeLoginController;
use App\Http\Controllers\Api\V1\Pos\Auth\LoginController as PosLoginController;
use App\Http\Controllers\Api\V1\BackOffice\User\UserController; // Tambahkan impor ini
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
    Route::post('/backoffice/auth/login', BackOfficeLoginController::class)->name('test.v1.backoffice.auth.login');
    
    Route::post('/pos/auth/login', PosLoginController::class)->name('test.v1.pos.auth.login');


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
        | USER MANAGEMENT MODULE (HR)
        |----------------------------------------------------------------------
        */
        Route::middleware(['role:admin,manager'])->group(function () {
            
            Route::prefix('users')->name('test.v1.backoffice.users.')->group(function () {
                Route::patch('/{user}/deactivate', [UserController::class, 'deactivate'])
                    ->name('deactivate');
            });

            Route::apiResource('users', UserController::class)->names('test.v1.backoffice.users');

        });

    });

});