<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $table = 'users';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'username',
        'password',
        'pin_code',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'pin_code',
        'remember_token',
    ];


    protected $casts = [
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];
}
