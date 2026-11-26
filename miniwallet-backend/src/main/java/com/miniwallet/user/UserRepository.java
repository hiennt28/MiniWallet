package com.miniwallet.user;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByPhone(String phone);

    Optional<User> findByPhone(String phone);

    /**
     * Đọc và khóa dòng user ({@code SELECT ... FOR UPDATE}) đến hết transaction.
     * Dùng khi kiểm tra PIN: các request song song cho cùng một người phải xếp hàng,
     * nếu không chúng cùng đọc "đã sai 3 lần" và bộ đếm bị ghi đè, kẻ tấn công thử được nhiều hơn 5 lần.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.phone = :phone")
    Optional<User> findByPhoneForUpdate(@Param("phone") String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
}
