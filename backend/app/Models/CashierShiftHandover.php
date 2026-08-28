<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashierShiftHandover extends Model
{
    use HasFactory;

    protected $fillable = [
        'cashier_shift_id',
        'from_user_id',
        'to_user_id',
        'amount_counted',
        'notes',
    ];

    protected $casts = [
        'amount_counted' => 'decimal:2',
    ];

    public function cashierShift(): BelongsTo
    {
        return $this->belongsTo(CashierShift::class);
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}