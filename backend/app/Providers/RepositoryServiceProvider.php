<?php

namespace App\Providers;

use App\Contracts\Repositories\CashierShiftRepositoryInterface;
use App\Contracts\Repositories\ShiftRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use App\Repositories\CashierShiftRepository;
use App\Repositories\ShiftRepository;
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
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}