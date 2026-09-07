<?php

namespace App\Http\Controllers\Api\V1\Pos\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\VerifyPinRequest;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Exception;
use Illuminate\Support\Facades\Log;

class VerifyPinController extends Controller
{
    /**
     * @var AuthService
     */
    protected AuthService $authService;

    /**
     * Inject the Auth Service.
     * 
     * @param AuthService $authService
     */
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Handle the PIN verification request.
     * 
     * @param VerifyPinRequest $request
     * @return JsonResponse
     */
    public function __invoke(VerifyPinRequest $request): JsonResponse
    {
        try {
            $this->authService->verifyPin(
                $request->user(),
                $request->validated('pin_code')
            );

            return response()->json([
                'success' => true,
                'message' => 'PIN verified successfully.'
            ], Response::HTTP_OK);

        } catch (AuthenticationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect PIN.',
                'error' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
            
        } catch (AccessDeniedHttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], Response::HTTP_FORBIDDEN);
            
        } catch (Exception $e) {
            Log::error('Verify PIN System Error: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'System error occurred. Please try again.'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}