<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| K6 / Load Testing Routes (No Throttle)
|--------------------------------------------------------------------------
| Rute ini didaftarkan khusus di lingkungan non-production melalui
| bootstrap/app.php dengan prefix '/api-test/v1'.
*/

Route::prefix('v1')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('/login', LoginController::class)->name('test.v1.login');
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        
        Route::prefix('auth')->group(function () {
            Route::get('/me', MeController::class)->name('test.v1.me');
            Route::post('/logout', LogoutController::class)->name('test.v1.logout');
        });

    });

});