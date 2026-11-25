export type ApiErrorCode =
  | 'UNKNOWN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'TOO_SOON'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_LOCKED'
  | 'INSUFFICIENT_BALANCE'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'PHONE_TAKEN'
  | 'PIN_INVALID'
  | 'PIN_LOCKED'
  | 'WALLET_FROZEN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(message: string, code: ApiErrorCode = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Lỗi bắt được trong catch có kiểu unknown: lấy ra mã và thông báo an toàn. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
}
