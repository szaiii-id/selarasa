<?php

namespace App\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class AuthService
{
    /**
     * Inject the repository via Constructor Property Promotion.
     */
    public function __construct(
        protected UserRepositoryInterface $userRepository
    ) {}

    /**
     * Strictly validate user credentials, account status, and role
     * WITHOUT creating a session/cookie.
     *
     * NOTE: Caching is intentionally NOT used here. The `users` table's
     * unique index on `username` already makes this lookup fast, and
     * caching a full Eloquent Model (including the password hash) proved
     * unsafe under concurrent load — serialized objects could be read
     * back in a corrupted/incomplete state, causing intermittent 500s.
     * See: incident during k6 load testing (Aug 2026).
     *
     * @param array{username: string, password: string} $credentials
     * @param array<int, string> $allowedRoles
     * @return User
     * @throws AuthenticationException|AccessDeniedHttpException
     */
    public function validateCredentials(array $credentials, array $allowedRoles = []): User
    {
        $user = $this->userRepository->findByUsername($credentials['username']);

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw new AuthenticationException('Invalid username or password.');
        }

        if (!$user->is_active) {
            throw new AccessDeniedHttpException('Your account has been deactivated. Please contact the manager.');
        }

        if (!empty($allowedRoles) && !in_array(strtolower($user->role), array_map('strtolower', $allowedRoles), true)) {
            throw new AccessDeniedHttpException('Invalid credentials or insufficient permissions to access this area.');
        }

        return $user;
    }

    /**
     * Create an authenticated session for a validated user.
     *
     * @param User $user
     * @return void
     */
    public function createSession(User $user): void
    {
        Auth::login($user);

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    /**
     * Process the logout logic and terminate the current session.
     * Placeholder for future shift-closing logic (e.g. auto close active shift
     * for cashier/inventory roles before the session is destroyed).
     *
     * @param Request $request
     * @return void
     */
    public function logout(Request $request): void
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }
}