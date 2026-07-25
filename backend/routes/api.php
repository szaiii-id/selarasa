<?php

use App\Http\Controllers\Auth\LoginController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // k6 test
    Route::prefix('auth')->group(function () {
        Route::post('/login', LoginController::class)->name('api.v1.login');
    });
    
    // Route::middleware('throttle:5,1')->prefix('auth')->group(function () {
    //     Route::post('/login', LoginController::class)->name('api.v1.login');
    // });
    

    Route::middleware('auth:sanctum')->group(function () {
        // Protected routes will be placed here
        });
        
});