<?php

namespace App\Providers;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use App\Observers\UserObserver;
use App\Repositories\UserRepository;
use Illuminate\Support\ServiceProvider;

use function Psy\bin;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            UserRepositoryInterface::class,
            UserRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        User::observe(UserObserver::class);
    }
}
