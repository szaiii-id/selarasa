<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LoginController extends Controller
{
    /** 
     * @var AuthService
     */
    protected AuthService $authService;

    /**
     * Inject the Auth Service to handle bussines logic
     * 
     * @param Authservice $authService
     */
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Handle the incoming API login request.
     * Using __invoke because this controller handles a single action.
     * 
     * @param LoginRequest $request (Validation Happen automatically here)
     * @return JsonResponse
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        $user = $this->authService->login($request->validated());

        return response()->json([
            'message' => 'Login Successful.',
            'data' => [
                'user' => new UserResource($user)
            ]
        ], Response::HTTP_OK);
    }

}
