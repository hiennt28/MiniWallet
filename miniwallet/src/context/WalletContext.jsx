import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { getWallet } from '../api/walletApi';
import { createInitialWalletState, walletReducer } from './walletReducer';

const WalletContext = createContext(null);
const HIDE_BALANCE_KEY = 'miniwallet:hideBalance';

function readHideBalance() {
  try {
    return localStorage.getItem(HIDE_BALANCE_KEY) === '1';
  } catch {
    return false;
  }
}

export function WalletProvider({ children }) {
  const [state, dispatch] = useReducer(walletReducer, undefined, () =>
    createInitialWalletState({ hideBalance: readHideBalance() }),
  );

  const refresh = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const data = await getWallet();
      dispatch({ type: 'LOAD_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'LOAD_ERROR', error });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_BALANCE_KEY, state.hideBalance ? '1' : '0');
    } catch {
      /* bỏ qua */
    }
  }, [state.hideBalance]);

  const toggleBalance = useCallback(() => dispatch({ type: 'TOGGLE_BALANCE' }), []);

  const value = useMemo(() => ({ ...state, refresh, toggleBalance }), [state, refresh, toggleBalance]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet() phải được dùng bên trong <WalletProvider>.');
  return ctx;
}
