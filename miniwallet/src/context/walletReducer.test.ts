import { describe, expect, it } from 'vitest';
import { createInitialWalletState, walletReducer } from './walletReducer';

const payload = { balance: 100, profile: { name: 'A', phone: '0912345678' }, contacts: [], frozen: false };

describe('walletReducer', () => {
  it('lần tải đầu là "loading", tải lại khi đã có dữ liệu là "refreshing"', () => {
    let state = walletReducer(createInitialWalletState(), { type: 'LOAD_START' });
    expect(state.status).toBe('loading');
    state = walletReducer(state, { type: 'LOAD_SUCCESS', payload });
    expect(state.status).toBe('ready');
    expect(walletReducer(state, { type: 'LOAD_START' }).status).toBe('refreshing');
  });

  it('lỗi khi làm mới vẫn giữ dữ liệu cũ', () => {
    const ready = walletReducer(createInitialWalletState(), { type: 'LOAD_SUCCESS', payload });
    const state = walletReducer(ready, { type: 'LOAD_ERROR', error: new Error('x') });
    expect(state.status).toBe('ready');
    expect(state.balance).toBe(100);
  });

  it('lỗi ở lần tải đầu chuyển sang "error"', () => {
    const state = walletReducer(createInitialWalletState(), { type: 'LOAD_ERROR', error: new Error('x') });
    expect(state.status).toBe('error');
  });

  it('bật/tắt ẩn số dư', () => {
    const state = walletReducer(createInitialWalletState(), { type: 'TOGGLE_BALANCE' });
    expect(state.hideBalance).toBe(true);
  });
});
