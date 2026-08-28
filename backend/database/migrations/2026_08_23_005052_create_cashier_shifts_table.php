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
        Schema::create('cashier_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete(); 
            $table->foreignUuid('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('shift_id')->constrained('shifts')->restrictOnDelete();
            $table->decimal('opening_balance', 15, 2); 
            $table->decimal('closing_balance', 15, 2)->nullable();
            $table->decimal('expected_balance', 15, 2)->nullable();
            $table->decimal('variance', 15, 2)->nullable(); 
            $table->string('status', 20)->default('open'); 
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']); 
            $table->index(['started_at', 'ended_at']); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cashier_shifts');
    }
};
