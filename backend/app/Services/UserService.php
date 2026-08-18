<?php

namespace App\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Exception;

class UserService
{
    /**
     * Define the cache Time-To-Live (TTL) in seconds.
     * 3600 seconds = 1 hour.
     */
    protected const CACHE_TTL = 3600;

    /**
     * Inject the UserRepositoryInterface.
     *
     * @param UserRepositoryInterface $userRepository
     */
    public function __construct(
        protected UserRepositoryInterface $userRepository
    ) {}

    /**
     * Get a paginated list of users based on provided filters.
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function getPaginatedUsers(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->userRepository->paginate($perPage, $filters);
    }

    /**
     * Retrieve a user by their UUID with enterprise-grade caching.
     * 
     * SECURITY: Sensitive fields are stripped before caching.
     * PERFORMANCE: Redis caching to reduce database load.
     * RELIABILITY: Array caching prevents serialization issues.
     *
     * @param string $id
     * @return User
     * @throws ModelNotFoundException
     */
    public function getUserById(string $id): User
    {
        $cacheKey = "users:profile:{$id}";

        /** @var array<string, mixed> $cachedUserData */
        $cachedUserData = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($id): array {
            $user = $this->userRepository->findById($id);

            // Throw exception inside closure to prevent caching null values
            if (!$user) {
                throw new ModelNotFoundException("User with ID {$id} not found.");
            }

            // SECURITY: Strip sensitive fields before caching
            // Return plain array to prevent Eloquent serialization issues
            return $user->makeHidden([
                'password',
                'remember_token',
            ])->toArray();
        });

        // Rehydrate Eloquent Model from cached array data
        $rehydratedUser = new User();
        $rehydratedUser->setRawAttributes($cachedUserData, true);
        $rehydratedUser->exists = true;
        $rehydratedUser->wasRecentlyCreated = false;

        return $rehydratedUser;
    }
    /**
     * Create a new user with proper password hashing.
     *
     * @param array $data
     * @return User
     * @throws Exception
     */
    public function createUser(array $data): User
    {
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        try {
            return DB::transaction(fn () => $this->userRepository->create($data));
        } catch (Exception $e) {
            Log::error('Failed to create user: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update an existing user.
     * Handles password hashing conditionally and prevents role escalation.
     * Cache invalidation is handled automatically by UserObserver.
     *
     * @param string $id
     * @param array $data
     * @return User
     * @throws Exception
     */
    public function updateUser(string $id, array $data): User
    {
        $user = $this->getUserById($id);
        $currentUser = auth()->user();

        // Security Guard
        if (isset($data['role']) && $data['role'] === 'admin' && $currentUser?->role !== 'admin') {
            throw new AuthorizationException('Unauthorized action: Only administrators can assign the admin role.');
        }

        // Handle password update
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        try {
            $updatedUser = DB::transaction(function () use ($user, $data) {
                $this->userRepository->update($user, $data);
                
                return $this->userRepository->findById($user->id);
            });
            
            return $updatedUser;
        } catch (Exception $e) {
            Log::error("Failed to update user ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Safely deactivate a user to preserve relational data (e.g., POS transactions).
     *
     * Includes safety guards to prevent an admin from locking themselves out
     * of the system, either by deactivating their own account or by removing
     * the last remaining active administrator.
     *
     * @param string $id
     * @return bool
     * @throws AuthorizationException
     */
    public function deactivateUser(string $id): bool
    {
        $user = $this->getUserById($id);
        $currentUser = auth()->user();

        // Guard 1: Prevent a user from deactivating their own account.
        if ($currentUser && $user->id === $currentUser->id) {
            throw new AuthorizationException('You cannot deactivate your own account.');
        }

        if (strtolower($user->role) === 'admin') {
            $activeAdminCount = $this->userRepository->countActiveByRole('admin');

            if ($activeAdminCount <= 1) {
                throw new AuthorizationException('Cannot deactivate the last remaining active administrator.');
            }
        }

        try {
            return $this->userRepository->deactivate($user);
        } catch (Exception $e) {
            Log::error("Failed to deactivate user ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Hard delete a user.
     * Proactively guards against FK constraints and handles PostgreSQL violations gracefully.
     *
     * @param string $id
     * @return bool
     * @throws Exception
     */
    public function deleteUser(string $id): bool
    {
        $user = $this->getUserById($id);

        try {
            return $this->userRepository->delete($user);
        } catch (QueryException $e) {
            Log::error("Database error while deleting user ID {$id}: " . $e->getMessage());
            
            // Catch PostgreSQL Foreign Key Violation (SQLSTATE 23503)
            if ($e->getCode() === '23503') {
                // Uses Symfony's built-in ConflictHttpException (Translates to HTTP 409 Conflict)
                throw new ConflictHttpException('Cannot delete this user because they have related transaction records. Consider deactivating instead.');
            }
            
            throw $e;
        } catch (Exception $e) {
            Log::error("Failed to hard delete user ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }
}