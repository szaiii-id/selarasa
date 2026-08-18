<?php

namespace App\Http\Controllers\Api\V1\BackOffice\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    /**
     * Inject the UserService.
     *
     * @param UserService $userService
     */
    public function __construct(
        protected UserService $userService
    ) {}

    /**
     * Display a paginated listing of the users.
     *
     * @param Request $request
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) $request->query('per_page', 15);
        
        // Exclude pagination parameters to pass the rest as filters
        $filters = $request->except(['page', 'per_page']);

        $users = $this->userService->getPaginatedUsers($perPage, $filters);

        return UserResource::collection($users);
    }

    /**
     * Store a newly created user in storage.
     *
     * @param StoreUserRequest $request
     * @return JsonResponse
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser($request->validated());

        return response()->json([
            'message' => 'User created successfully.',
            'data'    => UserResource::make($user)
        ], Response::HTTP_CREATED);
    }

    /**
     * Display the specified user.
     *
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $id): JsonResponse
    {
        $user = $this->userService->getUserById($id);

        return response()->json([
            'message' => 'User retrieved successfully.',
            'data'    => UserResource::make($user)
        ], Response::HTTP_OK);
    }

    /**
     * Update the specified user in storage.
     *
     * @param UpdateUserRequest $request
     * @param string $id
     * @return JsonResponse
     */
    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = $this->userService->updateUser($id, $request->validated());

        return response()->json([
            'message' => 'User updated successfully.',
            'data'    => UserResource::make($user)
        ], Response::HTTP_OK);
    }

    /**
     * Deactivate the specified user.
     *
     * @param string $id
     * @return JsonResponse
     */
    public function deactivate(string $id): JsonResponse
    {
        $this->userService->deactivateUser($id);

        return response()->json([
            'message' => 'User has been deactivated successfully.'
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified user from storage.
     *
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(string $id): JsonResponse
    {
        $this->userService->deleteUser($id);

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}