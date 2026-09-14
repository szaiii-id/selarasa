<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class StockMovement extends Model
{
    use HasFactory;

    /**
     * Disable auto-management of updated_at.
     * This model is an immutable audit trail — only created_at is relevant.
     */
    const UPDATED_AT = null;

    /**
     * Whitelist movement types — single source of truth.
     */
    public const TYPES = ['IN', 'OUT', 'ADJUSTMENT'];

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
        'quantity'       => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after'  => 'decimal:2',
    ];

    // ==========================================
    // IMMUTABILITY GUARDS
    // ==========================================

    /**
     * Block mass update at the model level.
     *
     * PRD: "Immutable: Data mutasi tidak memiliki fitur Update atau Delete.
     *       Jika staf salah input +10 kg, dia harus membuat input baru
     *       berupa Adjustment -10 kg beserta alasannya."
     *
     * For legitimate corrections, use a NEW movement (ADJUSTMENT).
     * For testing/seeding, use DB::table('stock_movements')->insert().
     *
     * @throws RuntimeException
     */
    public function update(array $attributes = [], array $options = []): bool
    {
        throw new RuntimeException(
            'Stock movements are immutable and cannot be updated. ' .
            'Create a new ADJUSTMENT movement to correct the stock level instead.'
        );
    }

    /**
     * Block delete at the model level.
     *
     * PRD: Audit trail must be preserved forever.
     *
     * @throws RuntimeException
     */
    public function delete(): ?bool
    {
        throw new RuntimeException(
            'Stock movements are immutable and cannot be deleted. ' .
            'The audit trail must be preserved for accountability.'
        );
    }

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
     *
     * Type is normalized (uppercase + trim). Invalid types return an empty
     * result set instead of silently matching wrong rows.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        $type = strtoupper(trim($type));

        if (!in_array($type, self::TYPES, true)) {
            // Return empty result for invalid type — fail-safe
            return $query->whereRaw('1 = 0');
        }

        return $query->where('movement_type', $type);
    }

    /**
     * Scope a query to order the movements starting from the newest.
     *
     * Tie-breaker applied: primary sort by time, secondary sort by ID.
     * This guarantees stable ordering even when multiple movements share
     * the same created_at timestamp (common in bulk POS transactions).
     */
    public function scopeRecent(Builder $query): Builder
    {
        return $query->orderByDesc('created_at')->orderByDesc('id');
    }
}