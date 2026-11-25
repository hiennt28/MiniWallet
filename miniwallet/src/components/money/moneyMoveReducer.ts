/*
 * Luồng nạp / rút tiền: form → pin → success.
 * Lỗi nghiêm trọng (PIN bị khóa, ví bị khóa, ngân hàng từ chối...) thì về form và hiện lý do.
 */
import type { Transaction } from '../../types';
import type { MoneyMoveErrors, MoneyMoveField } from '../../utils/validators';

export type MoneyMoveStep = 'form' | 'pin' | 'success';

export interface MoneyMoveState {
  step: MoneyMoveStep;
  values: Record<MoneyMoveField, string>;
  errors: MoneyMoveErrors;
  submitting: boolean;
  error: string;
  result: Transaction | null;
}

export type MoneyMoveAction =
  | { type: 'CHANGE'; field: MoneyMoveField; value: string }
  | { type: 'VALIDATION_FAILED'; errors: MoneyMoveErrors }
  | { type: 'GO_PIN' }
  | { type: 'BACK_TO_FORM' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; message: string }
  | { type: 'CANCELLED'; message: string }
  | { type: 'SUCCESS'; tx: Transaction }
  | { type: 'RESET'; bankId?: string };

export function createMoneyMoveState(bankId = ''): MoneyMoveState {
  return { step: 'form', values: { bankId, amount: '' }, errors: {}, submitting: false, error: '', result: null };
}

export function moneyMoveReducer(state: MoneyMoveState, action: MoneyMoveAction): MoneyMoveState {
  switch (action.type) {
    case 'CHANGE': {
      const { [action.field]: _cleared, ...errors } = state.errors;
      return { ...state, values: { ...state.values, [action.field]: action.value }, errors, error: '' };
    }
    case 'VALIDATION_FAILED':
      return { ...state, errors: action.errors };
    case 'GO_PIN':
      return { ...state, step: 'pin', errors: {}, error: '' };
    case 'BACK_TO_FORM':
      return { ...state, step: 'form', submitting: false, error: '' };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: '' };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.message };
    case 'CANCELLED':
      return { ...state, step: 'form', submitting: false, error: action.message };
    case 'SUCCESS':
      return { ...state, step: 'success', submitting: false, error: '', result: action.tx };
    case 'RESET':
      // Giữ ngân hàng đã chọn để nạp/rút tiếp cho nhanh
      return createMoneyMoveState(action.bankId ?? state.values.bankId);
    default:
      return state;
  }
}
