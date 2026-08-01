<?php

namespace App\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthService
{
    protected $userRepository;

    /**
     * Define roles that are explicitly allowed to access the Back Office.
     * Cashier and unauthorized roles are strictly prohibited here.
     */
    private const ALLOWED_ROLES = [
        'admin',
        'manager',
        'inventory',
    ];

    /**
     * Inject the repository via constructor.
     *
     * @param UserRepositoryInterface $userRepository
     */
    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    /**
     * Process the login logic and authenticate user via Session.
     * 
     * @param array $credentials Contains 'username' and 'password'
     * @return User
     * @throws ValidationException|HttpResponseException
     */
    public function login(array $credentials): User
    {
        $user = $this->userRepository->findByUsername($credentials['username']);

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            $this->throwAuthenticationError('Invalid username or password.');
        }

        if (!$user->is_active) {
            $this->throwAuthenticationError('Your account has been deactivated. Please contact the manager.');
        }

        /**
         * Enforce role-based access control using the private allowed roles list.
         */
        if (!in_array($user->role, self::ALLOWED_ROLES, true)) {
            $this->throwAuthenticationError('You do not have access to this area.');
        }

        Auth::login($user);

        return $user;
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

    /**
     * Helper method to throw a global authentication error (HTTP 401).
     *
     * @param string $message
     * @return void
     * @throws HttpResponseException
     */
    private function throwAuthenticationError(string $message): void
    {
        throw new HttpResponseException(response()->json([
            'message' => $message
        ], Response::HTTP_UNAUTHORIZED));
    }
}