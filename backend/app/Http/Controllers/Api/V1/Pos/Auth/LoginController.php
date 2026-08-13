<?php

namespace App\Http\Controllers\Api\V1\Pos\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class LoginController extends Controller
{
    /**
     * Define roles explicitly allowed to access the POS Terminal application.
     * Admin and Manager are included for supervisory or emergency shifts.
     */
    private const ALLOWED_ROLES = [
        'admin',
        'manager',
        'cashier',
    ];

    /** 
     * @var AuthService
     */
    protected AuthService $authService;

    /**
     * Inject the Auth Service to handle business logic.
     * 
     * @param AuthService $authService
     */
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Handle the incoming POS Terminal login request.
     * Using __invoke because this controller handles a single action.
     * 
     * @param LoginRequest $request (Validation happens automatically here)
     * @return JsonResponse
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->validateCredentials(
            $request->validated(),
            self::ALLOWED_ROLES
        );

        $this->authService->createSession($user);

        return response()->json([
            'message' => 'Login Successful.',
            'data' => [
                'user' => new UserResource($user)
            ]
        ], Response::HTTP_OK);
    }
}