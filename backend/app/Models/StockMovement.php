<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory;

    /**
     * Disable auto-management of updated_at.
     * This model is an immutable audit trail — only created_at is relevant.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'raw_material_id',
        'user_id',
        'movement_type',
        'quantity',
        'balance_before',
        'balance_after',
        'reason',
        'reference_id',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    // ==========================================
    // RELATIONS
    // ==========================================
    
    /**
     * Get the raw material associated with the stock movement.
     */
    public function rawMaterial(): BelongsTo
    {
        return $this->belongsTo(RawMaterial::class);
    }

    /**
     * Get the user who performed the stock movement.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ==========================================
    // LOCAL SCOPES
    // ==========================================
    
    /**
     * Scope a query to filter movements by specific type (IN, OUT, ADJUSTMENT).
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('movement_type', $type);
    }

    /**
     * Scope a query to order the movements starting from the newest.
     */
    public function scopeRecent(Builder $query): Builder
    {
        // Tie-breaker applied: primary sort by time, secondary sort by ID
        return $query->orderByDesc('created_at')->orderByDesc('id');
    }
}