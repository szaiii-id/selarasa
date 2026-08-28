<?php

namespace App\Contracts\Repositories;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface UserRepositoryInterface
{
    /**
     * Get paginated users with optional filters.
     * Supports filtering by multiple roles.
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    /**
     * Find a user by their UUID.
     * Returns null if not found, delegating exception handling to the Service layer.
     *
     * @param string $id
     * @return User|null
     */
    public function findById(string $id): ?User;

    /**
     * Find a user by their username.
     *
     * @param string $username
     * @return User|null
     */
    public function findByUsername(string $username): ?User;

        /**
     * Get user details with aggregated statistics (Ready for future relations).
     *
     * @param string $id
     * @return User|null
     */
    public function findWithDetails(string $id): ?User;

    /**
     * Create a new user.
     * NOTE: Password hashing must be handled by the Service layer prior to calling this method.
     *
     * @param array $data
     * @return User
     */
    public function create(array $data): User;

    /**
     * Update an existing user.
     * NOTE: Password hashing must be handled by the Service layer prior to calling this method.
     *
     * @param User $user
     * @param array $data
     * @return bool
     */
    public function update(User $user, array $data): bool;

    /**
     * Safely deactivate a user without deleting their record.
     * Highly recommended for users with relational data (e.g., POS transactions).
     *
     * @param User $user
     * @return bool
     */
    public function deactivate(User $user): bool;

    /**
     * Hard delete a user.
     * WARNING: Use with caution. Prefer deactivate() if the user has relational constraints.
     *
     * @param User $user
     * @return bool
     */
    public function delete(User $user): bool;

    /**
     * Count active users by role.
     *
     * @param string $role
     * @return int
     */
    public function countActiveByRole(string $role): int;

    /**
     * Activate a deactivated user.
     *
     * @param User $user
     * @return bool
     */
    public function activate(User $user): bool;
}