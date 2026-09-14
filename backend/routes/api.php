<?php

use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\BackOffice\Auth\LoginController as BackOfficeLoginController;
use App\Http\Controllers\Api\V1\BackOffice\Inventory\RawMaterialCategoryController;
use App\Http\Controllers\Api\V1\BackOffice\Inventory\RawMaterialController;
use App\Http\Controllers\Api\V1\BackOffice\Inventory\StockMovementController;
use App\Http\Controllers\Api\V1\BackOffice\Shift\ShiftController;
use App\Http\Controllers\Api\V1\BackOffice\Shift\CashierShiftController as BackOfficeCashierShiftController;
use App\Http\Controllers\Api\V1\BackOffice\User\UserController;
use App\Http\Controllers\Api\V1\Pos\Auth\LoginController as PosLoginController;
use App\Http\Controllers\Api\V1\Pos\Auth\VerifyPinController;
use App\Http\Controllers\Api\V1\Pos\Shift\CashierShiftController;
use App\Http\Controllers\Api\V1\Pos\Shift\ShiftController as PosShiftController;
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
        | HR & OPERATIONS RESTRICTED AREA
        |----------------------------------------------------------------------
        | Only Admin and Manager are permitted in this module. 
        | Inventory will be denied.
        */
        Route::middleware(['role:admin,manager'])->group(function () {
            
            // ==========================================
            // USER MANAGEMENT
            // ==========================================
            Route::prefix('users')->name('api.v1.backoffice.users.')->group(function () {
                Route::patch('/{user}/deactivate', [UserController::class, 'deactivate'])->name('deactivate');
                Route::patch('/{user}/activate', [UserController::class, 'activate'])->name('activate');
            });
            Route::apiResource('users', UserController::class)->names('api.v1.backoffice.users');

            // ==========================================
            // SHIFT MANAGEMENT (MASTER DATA)
            // ==========================================
            Route::prefix('shifts')->name('api.v1.backoffice.shifts.')->group(function () {
                // Custom route for dropdowns (must be placed before apiResource to prevent {shift} parameter conflict)
                Route::get('/active', [ShiftController::class, 'active'])->name('active');
            });
            Route::apiResource('shifts', ShiftController::class)->names('api.v1.backoffice.shifts');

            // ==========================================
            // CASHIER SHIFT MONITORING & FORCE CLOSE
            // ==========================================
            Route::prefix('cashier-shifts')->name('api.v1.backoffice.cashier-shifts.')->group(function () {
                Route::get('/', [BackOfficeCashierShiftController::class, 'index'])->name('index');
                Route::post('/{id}/force-close', [BackOfficeCashierShiftController::class, 'forceClose'])->name('force-close');
            });

        });

        /*
        |----------------------------------------------------------------------
        | INVENTORY MANAGEMENT AREA
        |----------------------------------------------------------------------
        | Accessible by Admin, Manager, and Inventory (Staf Gudang).
        */
        Route::prefix('inventory')->name('api.v1.backoffice.inventory.')->group(function () {
            
            // ==========================================
            // RAW MATERIAL CATEGORIES
            // ==========================================
            Route::apiResource('categories', RawMaterialCategoryController::class)
                ->names('categories');

            // ==========================================
            // RAW MATERIAL MASTER
            // ==========================================
            // We exclude 'destroy' to enforce soft-deactivate via update logic.
            Route::apiResource('materials', RawMaterialController::class)
                ->except(['destroy'])
                ->names('materials');

            // ==========================================
            // STOCK MOVEMENTS (AUDIT TRAIL)
            // ==========================================
            // Strictly locked to 'index' and 'store' for immutable audit trails.
            Route::apiResource('movements', StockMovementController::class)
                ->only(['index', 'store'])
                ->names('movements');

        });

    });

    /*
    |--------------------------------------------------------------------------
    | 4. PROTECTED POS ROUTES
    |--------------------------------------------------------------------------
    | Main POS Gateway:
    | Accessible by Admin, Manager, and Cashier.
    | Inventory will be denied access to POS functionalities.
    */
    Route::middleware(['auth:sanctum', 'active', 'throttle:api', 'role:admin,manager,cashier'])
        ->prefix('pos')
        ->group(function () {


        // ==========================================
        // POS SECURITY & LOCK SCREEN
        // ==========================================
        Route::post('/auth/verify-pin', VerifyPinController::class)
            ->middleware('throttle:pin-verification')
            ->name('api.v1.pos.auth.verify-pin');


        // ==========================================
        // MASTER SHIFT (Read-Only untuk POS)
        // ==========================================
            Route::get('/master-shifts', [PosShiftController::class, 'active'])
                ->name('api.v1.pos.master-shifts.active');

        /*
        |----------------------------------------------------------------------
        | CASHIER SHIFT SESSION MODULE
        |----------------------------------------------------------------------
        | Handled by the cashier during their daily operations.
        */
        Route::prefix('shifts')->name('api.v1.pos.shifts.')->group(function () {
            
            Route::get('/current', [CashierShiftController::class, 'current'])->name('current');
            Route::post('/start', [CashierShiftController::class, 'start'])->name('start');
            Route::post('/{id}/close', [CashierShiftController::class, 'close'])->name('close');
            Route::post('/{id}/handover', [CashierShiftController::class, 'handover'])->name('handover');
            
        });


        // ==========================================
        // ACTIVE CASHIERS (For Shift Handover Dropdown)
        // ==========================================
        Route::get('/active-cashiers', [UserController::class, 'getActiveCashiers'])
            ->name('api.v1.pos.active-cashiers');

    });

});