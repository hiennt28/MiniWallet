/* Trạng thái ví dùng chung toàn ứng dụng (số dư, hồ sơ, danh bạ, khóa ví, ẩn/hiện số dư). */
import type { Contact, Profile, WalletInfo } from '../types';

export type WalletStatus = 'loading' | 'refreshing' | 'ready' | 'error';

export interface WalletState {
  status: WalletStatus;
  balance: number;
  profile: Profile | null;
  contacts: Contact[];
  /** Ví đang bị khóa khẩn cấp. */
  frozen: boolean;
  error: Error | null;
  hideBalance: boolean;
}

export type WalletAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; payload: WalletInfo }
  | { type: 'LOAD_ERROR'; error: Error }
  | { type: 'TOGGLE_BALANCE' };

export function createInitialWalletState({ hideBalance = false }: { hideBalance?: boolean } = {}): WalletState {
  return {
    status: 'loading',
    balance: 0,
    profile: null,
    contacts: [],
    frozen: false,
    error: null,
    hideBalance,
  };
}

export function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'LOAD_START':
      // Đã có dữ liệu thì chỉ "làm mới", giao diện không cần hiện khung chờ
      return { ...state, status: state.profile ? 'refreshing' : 'loading', error: null };
    case 'LOAD_SUCCESS': {
      const { balance, profile, contacts, frozen } = action.payload;
      return { ...state, status: 'ready', balance, profile, contacts, frozen, error: null };
    }
    case 'LOAD_ERROR':
      // Lỗi khi làm mới thì giữ dữ liệu cũ
      return { ...state, status: state.profile ? 'ready' : 'error', error: action.error };
    case 'TOGGLE_BALANCE':
      return { ...state, hideBalance: !state.hideBalance };
    default:
      return state;
  }
}
