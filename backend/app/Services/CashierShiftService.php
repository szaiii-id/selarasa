<?php

namespace App\Services;

use App\Contracts\Repositories\CashierShiftRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\CashierShift;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Exception;

class CashierShiftService
{
    /**
     * Inject required repositories.
     *
     * @param CashierShiftRepositoryInterface $cashierShiftRepository
     * @param UserRepositoryInterface $userRepository
     */
    public function __construct(
        protected CashierShiftRepositoryInterface $cashierShiftRepository,
        protected UserRepositoryInterface $userRepository
    ) {}

    /**
     * Get paginated shift history based on provided filters.
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function getPaginatedHistory(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->cashierShiftRepository->paginateHistory($perPage, $filters);
    }

    /**
     * Get the active session for fault-tolerance (Resume Session feature).
     *
     * @param string $userId
     * @return CashierShift|null
     */
    public function getActiveShiftForUser(string $userId): ?CashierShift
    {
        return $this->cashierShiftRepository->findOpenShiftByUser($userId);
    }

    /**
     * Start a new shift session for the POS.
     *
     * @param string $userId
     * @param array $data (Contains shift_id, opening_balance, pin_code, notes)
     * @return CashierShift
     * @throws Exception
     */
    public function startShift(string $userId, array $data): CashierShift
    {
        $this->verifyUserPin($userId, $data['pin_code']);

        // Prevent Double-Opening (Fault Tolerance Rule)
        $activeShift = $this->getActiveShiftForUser($userId);
        if ($activeShift) {
            throw new ConflictHttpException('You already have an active shift session. Please close it before starting a new one.');
        }

        $shiftPayload = [
            'user_id'         => $userId,
            'shift_id'        => $data['shift_id'],
            'opening_balance' => $data['opening_balance'],
            'status'          => CashierShift::STATUS_OPEN,
            'started_at'      => now(),
            'notes'           => $data['notes'] ?? null,
        ];

        try {
            return DB::transaction(fn () => $this->cashierShiftRepository->create($shiftPayload));
        } catch (Exception $e) {
            Log::error("Failed to start shift for user {$userId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * End a shift session securely.
     *
     * @param int $shiftSessionId
     * @param string $userId
     * @param array $data (Contains closing_balance, expected_balance, pin_code, notes)
     * @return CashierShift
     * @throws Exception
     */
    public function closeShift(int $shiftSessionId, string $userId, array $data): CashierShift
    {
        $this->getFreshActiveShift($shiftSessionId, $userId);
        $this->verifyUserPin($userId, $data['pin_code']);

        $expectedBalance = $data['expected_balance'];
        $closingBalance  = $data['closing_balance'];
        $variance        = $closingBalance - $expectedBalance;

        try {
            return DB::transaction(function () use ($shiftSessionId, $userId, $data, $closingBalance, $expectedBalance, $variance) {
                $cashierShift = $this->cashierShiftRepository->findOpenShiftByIdWithLock($shiftSessionId);

                if (!$cashierShift || $cashierShift->status !== CashierShift::STATUS_OPEN || $cashierShift->user_id !== $userId) {
                    throw new ConflictHttpException('Shift session is already closed, processed, or no longer belongs to you.');
                }

                $updatePayload = [
                    'closing_balance'  => $closingBalance,
                    'expected_balance' => $expectedBalance,
                    'variance'         => $variance,
                    'status'           => CashierShift::STATUS_CLOSED,
                    'ended_at'         => now(),
                    'notes'            => $data['notes'] ?? $cashierShift->notes,
                ];

                $this->cashierShiftRepository->update($cashierShift, $updatePayload);
                return $cashierShift->fresh();
            });
        } catch (Exception $e) {
            Log::error("Failed to close shift session ID {$shiftSessionId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handover an active shift (Emergency Switch).
     *
     * @param int $shiftSessionId
     * @param string $fromUserId
     * @param array $data
     * @return CashierShift
     * @throws Exception
     */
    public function handoverShift(int $shiftSessionId, string $fromUserId, array $data): CashierShift
    {
        $this->getFreshActiveShift($shiftSessionId, $fromUserId);

        if ($data['to_user_id'] === $fromUserId) {
            throw new ConflictHttpException('Cannot hand over a shift to yourself.');
        }

        $this->verifyUserPin($fromUserId, $data['pin_code']);

        $this->verifyUserPin($data['to_user_id'], $data['to_user_pin']);

        try {
            return DB::transaction(function () use ($shiftSessionId, $fromUserId, $data) {
                $cashierShift = $this->cashierShiftRepository->findOpenShiftByIdWithLock($shiftSessionId);

                if (!$cashierShift || $cashierShift->status !== CashierShift::STATUS_OPEN || $cashierShift->user_id !== $fromUserId) {
                    throw new ConflictHttpException('Handover failed: Shift is no longer active or already processed.');
                }

                $existingShiftForReceiver = $this->getActiveShiftForUser($data['to_user_id']);
                if ($existingShiftForReceiver) {
                    throw new ConflictHttpException('The selected cashier already has an active shift session and cannot receive a handover.');
                }

                $this->cashierShiftRepository->createHandoverRecord([
                    'cashier_shift_id' => $cashierShift->id,
                    'from_user_id'     => $fromUserId,
                    'to_user_id'       => $data['to_user_id'],
                    'amount_counted'   => $data['amount_counted'],
                    'notes'            => $data['notes'] ?? null,
                ]);

                $this->cashierShiftRepository->update($cashierShift, [
                    'user_id' => $data['to_user_id'],
                ]);

                return $cashierShift->fresh();
            });
        } catch (Exception $e) {
            Log::error("Failed to handover shift session ID {$shiftSessionId}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Force close a shift session (Admin/Manager override).
     *
     * @param int $shiftSessionId
     * @param string $managerId
     * @param array $data (Contains expected_balance, closing_balance, notes)
     * @return CashierShift
     * @throws Exception
     */
    public function forceClose(int $shiftSessionId, string $managerId, array $data): CashierShift
    {
        try {
            return DB::transaction(function () use ($shiftSessionId, $managerId, $data) {
                $cashierShift = $this->cashierShiftRepository->findOpenShiftByIdWithLock($shiftSessionId);

                if (!$cashierShift || $cashierShift->status !== CashierShift::STATUS_OPEN) {
                    throw new ConflictHttpException('Shift session is already closed or not found.');
                }

                $expectedBalance = $data['expected_balance'];
                $closingBalance  = $data['closing_balance'] ?? $expectedBalance;

                $updatePayload = [
                    'closing_balance'   => $closingBalance,
                    'expected_balance'  => $expectedBalance,
                    'variance'          => $closingBalance - $expectedBalance,
                    'status'            => CashierShift::STATUS_CLOSED,
                    'ended_at'          => now(),
                    'closed_by_user_id' => $managerId,
                    'notes'             => 'FORCE CLOSED BY MANAGER: ' . ($data['notes'] ?? ''),
                ];

                $this->cashierShiftRepository->update($cashierShift, $updatePayload);
                return $cashierShift->fresh();
            });
        } catch (Exception $e) {
            Log::error("Failed to force close shift session ID {$shiftSessionId}: " . $e->getMessage());
            throw $e;
        }
    }

    // ==========================================
    // PROTECTED HELPER METHODS
    // ==========================================

    /**
     * Retrieve a fresh active shift instance and ensure strict ownership.
     *
     * @param int $shiftSessionId
     * @param string $userId
     * @return CashierShift
     * @throws ModelNotFoundException|AuthorizationException
     */
    protected function getFreshActiveShift(int $shiftSessionId, string $userId): CashierShift
    {
        $cashierShift = $this->cashierShiftRepository->findOpenShiftById($shiftSessionId);
        
        if (!$cashierShift) {
            throw new ModelNotFoundException("Active shift session with ID {$shiftSessionId} not found or already closed.");
        }

        if ($cashierShift->user_id !== $userId) {
            // Can be bypassed later if an Admin/Manager performs a Force Close
            throw new AuthorizationException('Unauthorized action: You cannot close a shift session that belongs to another cashier.');
        }

        return $cashierShift;
    }

    /**
     * Helper to verify if the provided PIN is correct.
     *
     * @param string $userId
     * @param string $pinCode
     * @throws AuthorizationException
     */
    protected function verifyUserPin(string $userId, string $pinCode): void
    {
        $user = $this->userRepository->findById($userId);
        
        if (!$user || !Hash::check($pinCode, $user->pin_code)) {
            throw new AuthorizationException('Invalid PIN code. Access denied.');
        }
    }
}