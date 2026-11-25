import { describe, expect, it } from 'vitest';
import { initialTransferState, transferReducer, type TransferAction, type TransferState } from './transferReducer';
import type { Transaction } from '../../types';

const run = (actions: TransferAction[], state: TransferState = initialTransferState) => actions.reduce(transferReducer, state);

describe('transferReducer', () => {
  it('đi hết luồng form → confirm → otp → success', () => {
    const tx: Transaction = {
      id: 'tx_1',
      type: 'expense',
      category: 'transfer_out',
      title: 'Chuyển tiền',
      amount: 50_000,
      status: 'success',
      createdAt: new Date(2026, 10, 24).toISOString(),
    };
    let state = run([
      { type: 'CHANGE', field: 'phone', value: '0987654321' },
      { type: 'GO_CONFIRM' },
    ]);
    expect(state.step).toBe('confirm');

    state = run([{ type: 'SUBMIT_START' }, { type: 'OTP_SENT', transferId: 'tf_1', otp: '123456', sentAt: 1, expiresAt: 2 }], state);
    expect(state.step).toBe('otp');
    expect(state.submitting).toBe(false);
    expect(state.transferId).toBe('tf_1');

    state = transferReducer(state, { type: 'CONFIRM_SUCCESS', tx });
    expect(state.step).toBe('success');
    expect(state.result).toBe(tx);
    expect(state.otp).toBeNull();
  });

  it('sửa một trường thì xóa lỗi của trường đó', () => {
    const state = run([
      { type: 'VALIDATION_FAILED', errors: { phone: 'Sai', amount: 'Sai' } },
      { type: 'CHANGE', field: 'phone', value: '09' },
    ]);
    expect(state.errors).toEqual({ amount: 'Sai' });
  });

  it('bị hủy thì quay về form, giữ dữ liệu đã nhập và hiện lý do', () => {
    const state = run([
      { type: 'CHANGE', field: 'amount', value: '50.000' },
      { type: 'GO_CONFIRM' },
      { type: 'OTP_SENT', transferId: 'tf_1', otp: '123456', sentAt: 1, expiresAt: 2 },
      { type: 'CANCELLED', message: 'Đã hủy' },
    ]);
    expect(state.step).toBe('form');
    expect(state.values.amount).toBe('50.000');
    expect(state.error).toBe('Đã hủy');
    expect(state.transferId).toBeNull();
  });

  it('RESET trả về trạng thái ban đầu', () => {
    const state = run([{ type: 'CHANGE', field: 'note', value: 'abc' }, { type: 'RESET' }]);
    expect(state).toEqual(initialTransferState);
  });
});
