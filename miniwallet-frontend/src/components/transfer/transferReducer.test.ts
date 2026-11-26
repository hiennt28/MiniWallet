import { describe, expect, it } from 'vitest';
import { getTransferSteps, initialTransferState, transferReducer, type TransferAction, type TransferState } from './transferReducer';
import type { Transaction } from '../../types';

const run = (actions: TransferAction[], state: TransferState = initialTransferState) => actions.reduce(transferReducer, state);

const tx: Transaction = {
  id: 'tx_1',
  type: 'expense',
  category: 'transfer_out',
  title: 'Chuyển tiền',
  amount: 50_000,
  status: 'success',
  createdAt: new Date(2026, 10, 24).toISOString(),
};

describe('transferReducer', () => {
  it('số tiền nhỏ: form → confirm → pin → success', () => {
    let state = run([{ type: 'CHANGE', field: 'phone', value: '0987654321' }, { type: 'GO_CONFIRM' }, { type: 'GO_PIN' }]);
    expect(state.step).toBe('pin');

    state = run([{ type: 'SUBMIT_START' }, { type: 'CONFIRM_SUCCESS', tx }], state);
    expect(state.step).toBe('success');
    expect(state.result).toBe(tx);
  });

  it('số tiền lớn: pin → otp → success', () => {
    let state = run([{ type: 'GO_CONFIRM' }, { type: 'GO_PIN' }, { type: 'SUBMIT_START' }, { type: 'OTP_SENT', transferId: 'tf_1', otp: '123456', sentAt: 1, expiresAt: 2 }]);
    expect(state.step).toBe('otp');
    expect(state.submitting).toBe(false);
    expect(state.transferId).toBe('tf_1');

    state = transferReducer(state, { type: 'CONFIRM_SUCCESS', tx });
    expect(state.step).toBe('success');
    expect(state.otp).toBeNull();
  });

  it('sai PIN thì ở lại bước PIN và hiện lỗi; quay lại thì về bước xác nhận', () => {
    let state = run([{ type: 'GO_CONFIRM' }, { type: 'GO_PIN' }, { type: 'SUBMIT_START' }, { type: 'SUBMIT_ERROR', message: 'Sai PIN' }]);
    expect(state).toMatchObject({ step: 'pin', submitting: false, error: 'Sai PIN' });

    state = transferReducer(state, { type: 'BACK_TO_CONFIRM' });
    expect(state).toMatchObject({ step: 'confirm', error: '' });
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

describe('getTransferSteps', () => {
  it('chỉ hiện bước OTP khi giao dịch cần OTP', () => {
    expect(getTransferSteps(false).map((s) => s.key)).toEqual(['form', 'confirm', 'pin']);
    expect(getTransferSteps(true).map((s) => s.key)).toEqual(['form', 'confirm', 'pin', 'otp']);
  });
});
