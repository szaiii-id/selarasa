<?php

namespace App\Providers;

use App\Contracts\Repositories\CashierShiftRepositoryInterface;
use App\Contracts\Repositories\RawMaterialCategoryRepositoryInterface;
use App\Contracts\Repositories\RawMaterialRepositoryInterface;
use App\Contracts\Repositories\ShiftRepositoryInterface;
use App\Contracts\Repositories\StockMovementRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use App\Repositories\CashierShiftRepository;
use App\Repositories\RawMaterialCategoryRepository;
use App\Repositories\RawMaterialRepository;
use App\Repositories\ShiftRepository;
use App\Repositories\StockMovementRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // User Repository
        $this->app->bind(
            UserRepositoryInterface::class,
            UserRepository::class
        );

        // Master Shift Repository
        $this->app->bind(
            ShiftRepositoryInterface::class,
            ShiftRepository::class
        );

        // Cashier Shift Session Repository
        $this->app->bind(
            CashierShiftRepositoryInterface::class,
            CashierShiftRepository::class
        );

        // ==========================================
        // INVENTORY MODULE REPOSITORIES
        // ==========================================
        $this->app->bind(
            RawMaterialCategoryRepositoryInterface::class,
            RawMaterialCategoryRepository::class
        );

        $this->app->bind(
            RawMaterialRepositoryInterface::class,
            RawMaterialRepository::class
        );

        $this->app->bind(
            StockMovementRepositoryInterface::class,
            StockMovementRepository::class
        );
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}