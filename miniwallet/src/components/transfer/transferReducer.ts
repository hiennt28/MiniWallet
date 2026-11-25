/*
 * Luồng chuyển tiền là một "máy trạng thái" nhỏ:
 *   form → confirm → pin → (otp, chỉ khi số tiền lớn) → success
 * Có thể quay lại từ các bước sau; lỗi nghiêm trọng (sai OTP quá số lần, PIN bị khóa, ví bị khóa)
 * thì hủy và về form.
 */
import type { OtpTicket, Transaction } from '../../types';
import type { TransferErrors, TransferField } from '../../utils/validators';

export type TransferStep = 'form' | 'confirm' | 'pin' | 'otp' | 'success';

type VisibleStep = Exclude<TransferStep, 'success'>;

const ALL_STEPS: ReadonlyArray<{ key: VisibleStep; label: string }> = [
  { key: 'form', label: 'Nhập thông tin' },
  { key: 'confirm', label: 'Xác nhận' },
  { key: 'pin', label: 'Mã PIN' },
  { key: 'otp', label: 'Mã OTP' },
];

/** Các bước hiển thị trên thanh tiến trình: chỉ có bước OTP khi số tiền cần OTP. */
export function getTransferSteps(withOtp: boolean) {
  return withOtp ? ALL_STEPS : ALL_STEPS.filter((s) => s.key !== 'otp');
}

/** Giá trị thô trong form (chuỗi người dùng gõ, chưa chuyển sang số). */
export type TransferValues = Record<TransferField, string>;

type OtpFields = { [K in keyof OtpTicket]: OtpTicket[K] | null };

export interface TransferState extends OtpFields {
  step: TransferStep;
  values: TransferValues;
  errors: TransferErrors;
  submitting: boolean;
  error: string;
  result: Transaction | null;
}

export type TransferAction =
  | { type: 'CHANGE'; field: TransferField; value: string }
  | { type: 'VALIDATION_FAILED'; errors: TransferErrors }
  | { type: 'GO_CONFIRM' }
  | { type: 'GO_PIN' }
  | { type: 'BACK_TO_CONFIRM' }
  | { type: 'BACK_TO_FORM' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; message: string }
  | ({ type: 'OTP_SENT' } & OtpTicket)
  | { type: 'CANCELLED'; message: string }
  | { type: 'CONFIRM_SUCCESS'; tx: Transaction }
  | { type: 'RESET' };

const EMPTY_OTP: OtpFields = { transferId: null, otp: null, sentAt: null, expiresAt: null };

export const initialTransferState: TransferState = {
  step: 'form',
  values: { phone: '', amount: '', note: '' },
  errors: {},
  submitting: false,
  error: '',
  ...EMPTY_OTP,
  result: null,
};

export function transferReducer(state: TransferState, action: TransferAction): TransferState {
  switch (action.type) {
    case 'CHANGE': {
      const errors = { ...state.errors };
      delete errors[action.field];
      return { ...state, values: { ...state.values, [action.field]: action.value }, errors, error: '' };
    }
    case 'VALIDATION_FAILED':
      return { ...state, errors: action.errors };
    case 'GO_CONFIRM':
      return { ...state, step: 'confirm', errors: {}, error: '' };
    case 'GO_PIN':
      return { ...state, step: 'pin', error: '' };
    case 'BACK_TO_CONFIRM':
      return { ...state, step: 'confirm', submitting: false, error: '' };
    case 'BACK_TO_FORM':
      return { ...state, step: 'form', submitting: false, error: '', ...EMPTY_OTP };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: '' };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.message };
    case 'OTP_SENT':
      return {
        ...state,
        step: 'otp',
        submitting: false,
        error: '',
        transferId: action.transferId,
        otp: action.otp,
        sentAt: action.sentAt,
        expiresAt: action.expiresAt,
      };
    case 'CANCELLED':
      return { ...state, step: 'form', submitting: false, error: action.message, ...EMPTY_OTP };
    case 'CONFIRM_SUCCESS':
      return { ...state, step: 'success', submitting: false, error: '', ...EMPTY_OTP, result: action.tx };
    case 'RESET':
      return initialTransferState;
    default:
      return state;
  }
}
