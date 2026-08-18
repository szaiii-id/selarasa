<?php

namespace App\Observers;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class UserObserver
{
    /**
     * Handle the User "updated" event.
     */
    public function updated(User $user): void
    {
        if ($user->wasChanged('username')) {
            Cache::forget("users:login:{$user->getOriginal('username')}");
        }
        $this->clearCache($user);
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        $this->clearCache($user);
    }

    /**
     * Handle the User "restored" event.
     */
    public function restored(User $user): void
    {
        $this->clearCache($user);
    }

    /**
     * Handle the User "force deleted" event.
     */
    public function forceDeleted(User $user): void
    {
        $this->clearCache($user);
    }

    /**
     * Centralize cache clearing logic for the User model.
     * 
     * @param User $user
     * @return void
     */
    protected function clearCache(User $user): void
    {
        // Use standardized cache keys
        Cache::forget("users:login:{$user->username}");
        Cache::forget("users:profile:{$user->id}");
    }
}