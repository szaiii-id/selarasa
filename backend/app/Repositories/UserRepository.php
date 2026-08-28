<?php

namespace App\Repositories;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class UserRepository implements UserRepositoryInterface
{
    /**
     * Get paginated users with optional filters.
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function paginate(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = User::query();

        if (!empty($filters['search'])) {
            $query->where(function (Builder $q) use ($filters) {
                $q->where('name', 'ilike', '%' . $filters['search'] . '%')
                  ->orWhere('username', 'ilike', '%' . $filters['search'] . '%');
            });
        }

        if (!empty($filters['role'])) {
            if (is_array($filters['role'])) {
                $query->whereIn('role', $filters['role']);
            } else {
                $query->where('role', $filters['role']);
            }
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $isActiveBool = filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActiveBool);
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * Find a user by their UUID.
     *
     * @param string $id
     * @return User|null
     */
    public function findById(string $id): ?User
    {
        return User::find($id);
    }

    /**
     * Find a user by their username.
     *
     * @param string $username
     * @return User|null
     */
    public function findByUsername(string $username): ?User
    {
        return User::where('username', $username)->first();    
    }

    /**
     * Get user details with aggregated statistics (Ready for future relations).
     *
     * @param string $id
     * @return User|null
     */
    public function findWithDetails(string $id): ?User
    {
        $query = User::query();

        return $query->find($id);
    }

    /**
     * Create a new user.
     *
     * @param array $data
     * @return User
     */
    public function create(array $data): User
    {
        return User::create($data);
    }

    /**
     * Update an existing user.
     *
     * @param User $user
     * @param array $data
     * @return bool
     */
    public function update(User $user, array $data): bool
    {
        return $user->update($data);
    }

    /**
     * Safely deactivate a user.
     *
     * @param User $user
     * @return bool
     */
    public function deactivate(User $user): bool
    {
        return $user->update(['is_active' => false]);
    }

    /**
     * Activate a deactivated user.
     *
     * @param User $user
     * @return bool
     */
    public function activate(User $user): bool
    {
        return $user->update(['is_active' => true]);
    }

    /**
     * Hard delete a user.
     *
     * @param User $user
     * @return bool
     */
    public function delete(User $user): bool
    {
        return $user->delete();
    }

    /**
     * Count active users by role.
     *
     * @param string $role
     * @return int
     */
    public function countActiveByRole(string $role): int
    {
        return User::where('role', $role)->where('is_active', true)->count();
    }
}