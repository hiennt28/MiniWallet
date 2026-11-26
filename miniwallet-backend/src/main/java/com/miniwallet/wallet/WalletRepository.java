package com.miniwallet.wallet;

import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByUserId(Long userId);

    /** {@code SELECT ... FOR UPDATE}: giữ khóa dòng ví đến hết transaction khi thay đổi số dư. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.id = :id")
    Optional<Wallet> findByIdForUpdate(@Param("id") Long id);

    @Query("select w from Wallet w join fetch w.user u where u.phone = :phone")
    Optional<Wallet> findByUserPhone(@Param("phone") String phone);

    @Query("select w from Wallet w join fetch w.user where w.user.id = :userId")
    Optional<Wallet> findWithUserByUserId(@Param("userId") Long userId);

    /** Ví của người đang đăng nhập. Mỗi người dùng luôn có ví, nên thiếu ví là dữ liệu hỏng. */
    default Wallet getByUserId(Long userId) {
        return findByUserId(userId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy ví."));
    }
}
