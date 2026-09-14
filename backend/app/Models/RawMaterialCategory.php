<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMaterialCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
    ];

    // ==========================================
    // RELATIONS
    // ==========================================
    
    /**
     * Get the raw materials associated with this category.
     */
    public function rawMaterials(): HasMany
    {
        return $this->hasMany(RawMaterial::class, 'category_id');
    }

    // ==========================================
    // LOCAL SCOPES
    // ==========================================
    
    /**
     * Scope a query to search categories by name.
     */
    public function scopeSearch(Builder $query, string $keyword): Builder
    {
        return $query->where('name', 'ilike', "%{$keyword}%");
    }
}