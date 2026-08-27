<?php

namespace App\Observers;

use App\Models\Shift;
use Illuminate\Support\Facades\Cache;

class ShiftObserver
{
    /**
     * Handle the Shift "created" event.
     */
    public function created(Shift $shift): void
    {
        $this->clearCache();
    }

    /**
     * Handle the Shift "updated" event.
     */
    public function updated(Shift $shift): void
    {
        $this->clearCache();
    }

    /**
     * Handle the Shift "deleted" event.
     */
    public function deleted(Shift $shift): void
    {
        $this->clearCache();
    }

    /**
     * Handle the Shift "restored" event.
     */
    public function restored(Shift $shift): void
    {
        $this->clearCache();
    }

    /**
     * Handle the Shift "force deleted" event.
     */
    public function forceDeleted(Shift $shift): void
    {
        $this->clearCache();
    }

    /**
     * Centralize cache clearing logic for Master Shifts.
     * Since shifts are global master data, any change invalidates the global lists.
     * 
     * @return void
     */
    protected function clearCache(): void
    {
        // Clear all centralized master shift caches
        Cache::forget('shifts:all');
        Cache::forget('shifts:active');
    }
}