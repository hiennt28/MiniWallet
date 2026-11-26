package com.miniwallet.wallet;

import com.miniwallet.auth.PinService;
import com.miniwallet.transaction.TransactionRepository;
import com.miniwallet.user.UserResponse;
import com.miniwallet.wallet.dto.ContactResponse;
import com.miniwallet.wallet.dto.WalletResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletService {

    static final int CONTACT_LIMIT = 6;

    private final WalletRepository wallets;
    private final TransactionRepository transactions;
    private final PinService pinService;

    public WalletService(WalletRepository wallets, TransactionRepository transactions, PinService pinService) {
        this.wallets = wallets;
        this.transactions = transactions;
        this.pinService = pinService;
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(Long userId) {
        Wallet wallet = wallets.getByUserId(userId);
        var contacts = transactions.recentContacts(wallet.getId(), CONTACT_LIMIT).stream()
                .map(c -> new ContactResponse(c.getName(), c.getPhone()))
                .toList();
        return new WalletResponse(wallet.getBalance(), wallet.isFrozen(), UserResponse.from(wallet.getUser()), contacts);
    }

    /** Khóa khẩn cấp không cần PIN, để khóa được nhanh nhất (ví dụ khi mất điện thoại). */
    @Transactional
    public void freeze(Long userId) {
        wallets.getByUserId(userId).freeze();
    }

    /** Mở khóa bắt buộc nhập đúng PIN. */
    @Transactional
    public void unfreeze(Long userId, String pin) {
        pinService.verify(userId, pin);
        wallets.getByUserId(userId).unfreeze();
    }
}
