<?php

namespace App\Repositories;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;

class UserRepository implements UserRepositoryInterface
{
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
}