<?php

use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            /**
             * Register load testing routes (without throttle restrictions)
             * exclusively when the application is not in Production.
             */
            if (! app()->isProduction()) {
                Route::middleware('api')
                    ->prefix('api-test')
                    ->group(base_path('routes/api_testing.php'));
            }
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        /**
         * Enable Sanctum's stateful middleware stack for first-party SPA authentication.
         */
        $middleware->statefulApi();

        // // ============================================
        // // TAMBAHKAN INI - CSRF BYPASS UNTUK ROUTE TEST
        // // ============================================
        // $middleware->validateCsrfTokens(
        //     except: ['api-test/*']
        // );

        /**
         * Register application middleware aliases for route assignment.
         */
        $middleware->alias([
            'active' => EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
    /**
     * Force consistent JSON responses for API routes when exceptions occur.
     * Includes api-test/* so load-testing routes behave identically to production API.
     */
    $exceptions->shouldRenderJsonWhen(
        fn (Request $request) => $request->is('api/*') || $request->is('api-test/*'),
    );
})->create();