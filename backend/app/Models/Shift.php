<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ==========================================
    // RELATIONS
    // ==========================================
    
    /**
     * Get the cashier sessions associated with this master shift.
     */
    public function cashierShifts(): HasMany
    {
        return $this->hasMany(CashierShift::class);
    }

    // ==========================================
    // LOCAL SCOPES
    // ==========================================
    
    /**
     * Scope a query to only include active shifts.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}