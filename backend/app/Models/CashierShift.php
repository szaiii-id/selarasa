<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashierShift extends Model
{
    use HasFactory;

    // ==========================================
    // CONSTANTS
    // ==========================================
    public const STATUS_OPEN = 'open';
    public const STATUS_CLOSED = 'closed';

    protected $fillable = [
        'user_id',
        'closed_by_user_id',
        'shift_id',
        'opening_balance',
        'closing_balance',
        'expected_balance',
        'variance',
        'status',
        'started_at',
        'ended_at',
        'notes',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'expected_balance' => 'decimal:2',
        'variance'        => 'decimal:2',
        'started_at'      => 'datetime',
        'ended_at'        => 'datetime',
    ];

    // ==========================================
    // RELATIONS
    // ==========================================
    
    /**
     * Get the user (cashier) that owns the shift session.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the master shift associated with this session.
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
    * Get the handovers associated with this shift session.
    */
    public function handovers(): HasMany
    {
        return $this->hasMany(CashierShiftHandover::class);
    }

    /**
     * Get the user who closed the shift session.
     */
    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    // ==========================================
    // LOCAL SCOPES
    // ==========================================
    
    /**
     * Scope a query to only include currently open shifts.
     */
    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_OPEN);
    }

    /**
     * Scope a query to only include shifts for a specific user.
     */
    public function scopeForUser(Builder $query, string $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================
    
    /**
     * Check if the shift session is still open.
     */
    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    /**
     * Check if there is a cash variance (shortage or overage).
     */
    public function hasVariance(): bool
    {
        return $this->variance !== null && $this->variance != 0;
    }
}