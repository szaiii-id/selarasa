<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raw_material_id')->constrained('raw_materials')->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete(); 
            
            $table->string('movement_type', 20); 
            
            $table->decimal('quantity', 10, 2); 
            $table->decimal('balance_before', 10, 2);
            $table->decimal('balance_after', 10, 2);
            
            $table->string('reason', 255); 
            $table->string('reference_id', 100)->nullable(); 
            
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};