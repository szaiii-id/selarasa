<?php

namespace App\Observers;

use App\Models\RawMaterialCategory;
use Illuminate\Support\Facades\Cache;

class RawMaterialCategoryObserver
{
    /**
     * Handle the RawMaterialCategory "created" event.
     */
    public function created(RawMaterialCategory $category): void
    {
        $this->clearCache();
    }

    /**
     * Handle the RawMaterialCategory "updated" event.
     */
    public function updated(RawMaterialCategory $category): void
    {
        $this->clearCache();
    }

    /**
     * Handle the RawMaterialCategory "deleted" event.
     */
    public function deleted(RawMaterialCategory $category): void
    {
        $this->clearCache();
    }

    /**
     * Handle the RawMaterialCategory "restored" event.
     */
    public function restored(RawMaterialCategory $category): void
    {
        $this->clearCache();
    }

    /**
     * Handle the RawMaterialCategory "force deleted" event.
     */
    public function forceDeleted(RawMaterialCategory $category): void
    {
        $this->clearCache();
    }

    /**
     * Centralize cache clearing logic for Raw Material Categories.
     * Since categories are global master data, any change invalidates the global lists.
     * 
     * @return void
     */
    protected function clearCache(): void
    {
        Cache::forget('raw_material_categories:all');
    }
}