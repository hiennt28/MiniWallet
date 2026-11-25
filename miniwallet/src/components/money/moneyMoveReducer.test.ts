import { describe, expect, it } from 'vitest';
import { createMoneyMoveState, moneyMoveReducer, type MoneyMoveAction } from './moneyMoveReducer';
import type { Transaction } from '../../types';

const run = (actions: MoneyMoveAction[], state = createMoneyMoveState('bank_1')) => actions.reduce(moneyMoveReducer, state);

const tx: Transaction = {
  id: 'tx_1',
  type: 'income',
  category: 'topup',
  title: 'Nạp tiền',
  amount: 100_000,
  status: 'success',
  createdAt: new Date(2026, 10, 24).toISOString(),
};

describe('moneyMoveReducer', () => {
  it('đi hết luồng form → pin → success', () => {
    const state = run([{ type: 'CHANGE', field: 'amount', value: '100.000' }, { type: 'GO_PIN' }, { type: 'SUBMIT_START' }, { type: 'SUCCESS', tx }]);
    expect(state).toMatchObject({ step: 'success', submitting: false, result: tx });
  });

  it('sai PIN thì ở lại bước PIN; lỗi nghiêm trọng thì về form, giữ số tiền đã nhập', () => {
    let state = run([{ type: 'CHANGE', field: 'amount', value: '100.000' }, { type: 'GO_PIN' }, { type: 'SUBMIT_START' }, { type: 'SUBMIT_ERROR', message: 'Sai PIN' }]);
    expect(state).toMatchObject({ step: 'pin', error: 'Sai PIN' });

    state = moneyMoveReducer(state, { type: 'CANCELLED', message: 'Ví bị khóa' });
    expect(state).toMatchObject({ step: 'form', error: 'Ví bị khóa', values: { amount: '100.000' } });
  });

  it('sửa một trường thì xóa lỗi của trường đó', () => {
    const state = run([
      { type: 'VALIDATION_FAILED', errors: { bankId: 'Chọn ngân hàng', amount: 'Sai' } },
      { type: 'CHANGE', field: 'amount', value: '1' },
    ]);
    expect(state.errors).toEqual({ bankId: 'Chọn ngân hàng' });
  });

  it('làm giao dịch mới thì giữ ngân hàng đã chọn', () => {
    const state = run([{ type: 'CHANGE', field: 'bankId', value: 'bank_2' }, { type: 'SUCCESS', tx }, { type: 'RESET' }]);
    expect(state).toEqual(createMoneyMoveState('bank_2'));
  });
});
