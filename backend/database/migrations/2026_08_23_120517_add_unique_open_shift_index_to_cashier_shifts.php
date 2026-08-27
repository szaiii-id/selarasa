<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // PostgreSQL Partial Index: 1 user hanya boleh punya 1 shift yang berstatus 'open'
        DB::statement("CREATE UNIQUE INDEX unique_open_shift_per_user ON cashier_shifts (user_id) WHERE status = 'open';");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS unique_open_shift_per_user;");
    }
};