<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    
    Route::middleware('throttle:auth-strict')->prefix('auth')->group(function () {
        Route::post('/login', LoginController::class)->name('api.v1.login');
    });

    Route::middleware(['auth:sanctum', 'active', 'throttle:api'])->group(function () {
        
        Route::prefix('auth')->group(function () {
            Route::get('/me', MeController::class)->name('api.v1.me');
            Route::post('/logout', LogoutController::class)->name('api.v1.logout');
        });
    
    });
        
});