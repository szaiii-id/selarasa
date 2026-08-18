<?php

namespace App\Providers;

use App\Models\User;
use App\Observers\UserObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->register(RepositoryServiceProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        /**
         * Register model observers.
         */
        User::observe(UserObserver::class);

        /**
         * Configure application rate limiters.
         */
        $this->configureRateLimiting();
    }

    /**
     * Configure the rate limiters for the application.
     *
     * Tier 1 (auth-strict): Restricts authentication endpoints (e.g., login)
     *                       to 5 requests per minute per client IP address.
     * Tier 2 (api):         Restricts standard Back Office API requests
     *                       to 60 requests per minute per authenticated user or IP.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('auth-strict', function (Request $request): Limit {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute(60)->by(
                $request->user()?->id ?: $request->ip()
            );
        });
    }
}