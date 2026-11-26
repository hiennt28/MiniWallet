package com.miniwallet.auth;

import com.miniwallet.auth.TokenService.RotationResult;
import com.miniwallet.auth.dto.AuthResponse;
import com.miniwallet.auth.dto.LoginRequest;
import com.miniwallet.auth.dto.RegisterRequest;
import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.Transaction;
import com.miniwallet.transaction.TransactionRepository;
import com.miniwallet.user.User;
import com.miniwallet.user.UserRepository;
import com.miniwallet.wallet.Wallet;
import com.miniwallet.wallet.WalletRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    /** Tặng cho tài khoản mới để dùng thử ngay. */
    public static final long WELCOME_BONUS = 500_000;

    private final UserRepository users;
    private final WalletRepository wallets;
    private final TransactionRepository transactions;
    private final PinService pinService;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public AuthService(UserRepository users, WalletRepository wallets, TransactionRepository transactions,
                       PinService pinService, TokenService tokenService, PasswordEncoder passwordEncoder, Clock clock) {
        this.users = users;
        this.wallets = wallets;
        this.transactions = transactions;
        this.pinService = pinService;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    /** Tạo người dùng, ví kèm quà chào mừng và phiên đăng nhập, tất cả trong một transaction. */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (users.existsByPhone(request.phone())) throw phoneTaken();

        Instant now = clock.instant();
        User user;
        try {
            // saveAndFlush để lỗi UNIQUE (hai request đăng ký cùng số cùng lúc) xảy ra ngay tại đây
            user = users.saveAndFlush(User.register(request.name(), request.phone(),
                    passwordEncoder.encode(request.pin()), now));
        } catch (DataIntegrityViolationException e) {
            throw phoneTaken();
        }

        Wallet wallet = wallets.save(Wallet.open(user, WELCOME_BONUS, now));
        transactions.save(Transaction.record(wallet, Category.BONUS, "Quà chào mừng thành viên mới",
                WELCOME_BONUS, "Cảm ơn bạn đã đăng ký MiniWallet", now));

        return AuthResponse.of(tokenService.issue(user), user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = pinService.verifyLogin(request.phone(), request.pin());
        return AuthResponse.of(tokenService.issue(user), user);
    }

    public AuthResponse refresh(String refreshToken) {
        RotationResult result = tokenService.rotate(refreshToken);
        return AuthResponse.of(result.tokens(), result.user());
    }

    public void logout(String refreshToken) {
        tokenService.revoke(refreshToken);
    }

    private static ApiException phoneTaken() {
        return new ApiException(ErrorCode.PHONE_TAKEN, "Số điện thoại này đã được đăng ký. Vui lòng đăng nhập.");
    }
}
