<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMaterial extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'sku',
        'name',
        'unit',
        'current_stock',
        'minimum_stock',
        'is_active',
    ];

    protected $casts = [
        'current_stock' => 'decimal:2',
        'minimum_stock' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // ==========================================
    // RELATIONS
    // ==========================================
    
    /**
     * Get the category that owns the raw material.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(RawMaterialCategory::class, 'category_id');
    }

    /**
     * Get the stock movements for the raw material.
     */
    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    // ==========================================
    // LOCAL SCOPES
    // ==========================================
    
    /**
     * Scope a query to only include active raw materials.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include raw materials that need restocking.
     * (Current stock is less than or equal to minimum stock).
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('current_stock', '<=', 'minimum_stock');
    }
}