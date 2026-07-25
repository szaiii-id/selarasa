<?php

namespace App\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    protected $userRepository;

    /**
     * Inject the repository via constructor.
     *
     * @param UserRepositoryInterface $userRepo
     */
    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    /**
     * Process the login logic and generate an authentication token.
     * 
     * @param array $credentials Contains 'username' and 'password'
     * @return array
     * @throws ValidationException
     */
    public function login(array $credentials): array
    {
        $user = $this->userRepository->findByUsername($credentials['username']);

        if (!$user) {
            $this->throwValidationError('username', 'Invalid username or password.');
        }

        if (!$user->is_active) {
            $this->throwValidationError('username', 'Your account has been deactivated. Please contact the manager.');
        }

        if (!Hash::check($credentials['password'], $user->password)) {
            $this->throwValidationError('username', 'Invalid username or password.');
        }

        $user->tokens()->delete();

        $token = $user->createToken('selarasa_pos_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * Helper method to throw a validation error.
     * This automatically translates to an HTTP 422 JSON response in the API.
     *
     * @param string $field
     * @param string $message
     * @return void
     * @throws ValidationException
     */
    private function throwValidationError(string $field, string $message): void
    {
        throw ValidationException::withMessages([
            $field => [$message],
        ]);
    }
}