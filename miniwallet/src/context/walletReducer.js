/* Trạng thái ví dùng chung toàn ứng dụng (số dư, hồ sơ, danh bạ, ẩn/hiện số dư). */

export function createInitialWalletState({ hideBalance = false } = {}) {
  return {
    status: 'loading', // 'loading' | 'refreshing' | 'ready' | 'error'
    balance: 0,
    profile: null,
    contacts: [],
    error: null,
    hideBalance,
  };
}

export function walletReducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      // Đã có dữ liệu thì chỉ "làm mới", giao diện không cần hiện khung chờ
      return { ...state, status: state.profile ? 'refreshing' : 'loading', error: null };
    case 'LOAD_SUCCESS': {
      const { balance, profile, contacts } = action.payload;
      return { ...state, status: 'ready', balance, profile, contacts, error: null };
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
