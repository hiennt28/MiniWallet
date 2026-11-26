package com.miniwallet.auth;

import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.user.User;
import com.miniwallet.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kiểm tra mã PIN và áp dụng luật khóa khi sai nhiều lần.
 *
 * <p>Hai điểm quan trọng:
 * <ul>
 *   <li>{@code REQUIRES_NEW} + {@code noRollbackFor}: lần sai phải được lưu lại dù ngay sau đó
 *       ném exception. Nếu dùng chung transaction với nơi gọi, exception sẽ rollback luôn bộ đếm
 *       và người dùng thử sai bao nhiêu lần cũng được.</li>
 *   <li>Khóa dòng user ({@code FOR UPDATE}) để các request song song xếp hàng, không ghi đè bộ đếm của nhau.</li>
 * </ul>
 * Nơi gọi không được khóa hoặc sửa dòng user trước khi gọi các hàm này (transaction mới sẽ phải chờ chính nó).
 */
@Service
public class PinService {

    static final String WRONG_CREDENTIALS = "Số điện thoại hoặc mã PIN không đúng.";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    /** Mã băm giả để so sánh khi số điện thoại không tồn tại, giữ thời gian phản hồi như nhau. */
    private final String dummyHash;

    public PinService(UserRepository users, PasswordEncoder passwordEncoder, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("000000");
    }

    /**
     * Đăng nhập: sai số điện thoại hay sai PIN đều nhận cùng một thông báo,
     * để không dò được số nào đã đăng ký.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ApiException.class)
    public User verifyLogin(String phone, String pin) {
        User user = users.findByPhoneForUpdate(phone).orElse(null);
        if (user == null) {
            passwordEncoder.matches(pin, dummyHash);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, WRONG_CREDENTIALS);
        }
        return check(user, pin, ErrorCode.INVALID_CREDENTIALS, WRONG_CREDENTIALS, false);
    }

    /** Xác nhận thao tác của người đã đăng nhập (mở khóa ví, chuyển tiền...). */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ApiException.class)
    public User verify(Long userId, String pin) {
        User user = users.findByIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
        return check(user, pin, ErrorCode.PIN_INVALID, "Mã PIN không đúng.", true);
    }

    private User check(User user, String pin, ErrorCode wrongCode, String wrongMessage, boolean showAttemptsLeft) {
        Instant now = clock.instant();
        if (user.isPinLocked(now)) {
            throw new ApiException(ErrorCode.PIN_LOCKED,
                    "Bạn đã nhập sai PIN quá nhiều lần. Vui lòng thử lại sau " + user.pinLockMinutesLeft(now) + " phút.");
        }

        if (passwordEncoder.matches(pin, user.getPinHash())) {
            user.recordPinSuccess();
            return user;
        }

        boolean lockedNow = user.recordPinFailure(now);
        if (lockedNow) {
            throw new ApiException(ErrorCode.PIN_LOCKED,
                    "Bạn đã nhập sai PIN quá nhiều lần. Tài khoản tạm khóa "
                            + User.PIN_LOCK_DURATION.toMinutes() + " phút.");
        }
        String message = showAttemptsLeft
                ? wrongMessage + " Bạn còn " + user.pinAttemptsLeft() + " lần thử."
                : wrongMessage;
        throw new ApiException(wrongCode, message);
    }
}
