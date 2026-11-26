package com.miniwallet.transfer;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransferRepository extends JpaRepository<Transfer, UUID> {

    Optional<Transfer> findBySenderUserIdAndIdempotencyKey(Long senderUserId, String idempotencyKey);

    /** Khóa lệnh khi xác nhận OTP: hai request xác nhận cùng lúc không thể cùng chuyển tiền. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Transfer t where t.id = :id")
    Optional<Transfer> findByIdForUpdate(@Param("id") UUID id);
}
