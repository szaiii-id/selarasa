<?php

use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\BackOffice\Auth\LoginController as BackOfficeLoginController;
use App\Http\Controllers\Api\V1\Pos\Auth\LoginController as PosLoginController;
use App\Http\Controllers\Api\V1\BackOffice\User\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | 1. PUBLIC AUTHENTICATION ROUTES (Separate Endpoints for Role Validation)
    |--------------------------------------------------------------------------
    | These endpoints strictly validate credentials and roles BEFORE creating
    | an authenticated session/cookie.
    */
    Route::middleware('throttle:auth-strict')->group(function () {
        
        Route::post('/backoffice/auth/login', BackOfficeLoginController::class)
            ->name('api.v1.backoffice.auth.login');

        Route::post('/pos/auth/login', PosLoginController::class)
            ->name('api.v1.pos.auth.login');

    });

    /*
    |--------------------------------------------------------------------------
    | 2. PROTECTED SHARED AUTH ROUTES (Accessible by Both POS & Back-Office)
    |--------------------------------------------------------------------------
    | Requires an authenticated Sanctum session and an active user account.
    */
    Route::middleware(['auth:sanctum', 'active', 'throttle:api'])->group(function () {

        Route::prefix('auth')->group(function () {

            Route::get('/me', MeController::class)->name('api.v1.auth.me');
            Route::post('/logout', LogoutController::class)->name('api.v1.auth.logout');

        });

    });

    /*
    |--------------------------------------------------------------------------
    | 3. PROTECTED BACK-OFFICE ROUTES
    |--------------------------------------------------------------------------
    | Main Back-Office Gateway:
    | Only Admin, Manager, and Inventory roles can enter this area.
    | Cashiers will be automatically denied access (403 Forbidden).
    */
    Route::middleware(['auth:sanctum', 'active', 'throttle:api', 'role:admin,manager,inventory'])
        ->prefix('backoffice')
        ->group(function () {

        /*
        |----------------------------------------------------------------------
        | USER MANAGEMENT MODULE (HR)
        |----------------------------------------------------------------------
        | Restricted Area: We lock this down even further.
        | Out of the 3 roles present in the Back-Office, only Admin and Manager 
        | are permitted in this module. Inventory will be denied.
        */
        Route::middleware(['role:admin,manager'])->group(function () {
            
            Route::prefix('users')->name('api.v1.backoffice.users.')->group(function () {
                Route::patch('/{user}/deactivate', [UserController::class, 'deactivate'])
                    ->name('deactivate');
                Route::patch('/{user}/activate', [UserController::class, 'activate'])
                    ->name('activate');
            });

            Route::apiResource('users', UserController::class)->names('api.v1.backoffice.users');

        });

    });


});