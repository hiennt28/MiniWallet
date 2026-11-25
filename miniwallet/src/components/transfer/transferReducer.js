/*
 * Luồng chuyển tiền là một "máy trạng thái" nhỏ:
 *   form → confirm → otp → success
 * Có thể quay lại form từ confirm/otp; sai OTP quá số lần cho phép thì bị hủy và về form.
 */

export const TRANSFER_STEPS = [
  { key: 'form', label: 'Nhập thông tin' },
  { key: 'confirm', label: 'Xác nhận' },
  { key: 'otp', label: 'Xác thực OTP' },
];

const EMPTY_OTP = { transferId: null, otp: null, sentAt: null, expiresAt: null };

export const initialTransferState = {
  step: 'form',
  values: { phone: '', amount: '', note: '' },
  errors: {},
  submitting: false,
  error: '',
  ...EMPTY_OTP,
  result: null,
};

export function transferReducer(state, action) {
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
