package com.miniwallet.transfer;

import com.miniwallet.auth.PinService;
import com.miniwallet.common.error.ApiException;
import com.miniwallet.common.error.ErrorCode;
import com.miniwallet.common.security.AuthenticatedUser;
import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.Transaction;
import com.miniwallet.transaction.TransactionRepository;
import com.miniwallet.transaction.dto.TransactionResponse;
import com.miniwallet.transfer.dto.CreateTransferRequest;
import com.miniwallet.transfer.dto.OtpTicket;
import com.miniwallet.transfer.dto.TransferResult;
import com.miniwallet.transfer.otp.OtpService;
import com.miniwallet.wallet.Wallet;
import com.miniwallet.wallet.WalletRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Chuyển tiền giữa hai ví.
 *
 * <p>Dùng {@link TransactionTemplate} thay vì {@code @Transactional} để thấy rõ ranh giới từng transaction:
 * <ol>
 *   <li>Đọc và kiểm tra dữ liệu (người nhận, số dư, ví bị khóa): lỗi nhập liệu không làm mất lượt thử PIN.</li>
 *   <li>Kiểm tra PIN (transaction riêng trong {@link PinService}).</li>
 *   <li>Ghi: tạo lệnh, rồi trừ/cộng tiền ngay (khoản nhỏ) hoặc gửi OTP (khoản lớn).</li>
 * </ol>
 */
@Service
public class TransferService {

    private static final int IDEMPOTENCY_KEY_MAX = 64;

    private final TransferRepository transfers;
    private final WalletRepository wallets;
    private final TransactionRepository transactions;
    private final PinService pinService;
    private final OtpService otpService;
    private final Clock clock;
    private final TransactionTemplate writeTx;
    private final TransactionTemplate readTx;
    private final boolean exposeOtp;

    public TransferService(TransferRepository transfers, WalletRepository wallets, TransactionRepository transactions,
                           PinService pinService, OtpService otpService, Clock clock,
                           PlatformTransactionManager transactionManager,
                           @Value("${app.transfer.expose-otp}") boolean exposeOtp) {
        this.transfers = transfers;
        this.wallets = wallets;
        this.transactions = transactions;
        this.pinService = pinService;
        this.otpService = otpService;
        this.clock = clock;
        this.writeTx = new TransactionTemplate(transactionManager);
        this.readTx = new TransactionTemplate(transactionManager);
        this.readTx.setReadOnly(true);
        this.exposeOtp = exposeOtp;
    }

    /** Người gửi và người nhận đã kiểm tra hợp lệ. */
    private record Parties(Long senderUserId, String senderPhone, Long senderWalletId, Long receiverWalletId, String receiverPhone) {}

    /** Kết quả bước ghi, kèm mã OTP gốc (nếu có) để gửi đi sau khi transaction đã commit. */
    private record Started(TransferResult result, String otp) {}

    // ---------------------------------------------------------------- Bước 1: tạo lệnh

    public TransferResult create(AuthenticatedUser user, CreateTransferRequest request, String idempotencyKey) {
        String key = normalizeKey(idempotencyKey);
        if (key != null) {
            var existing = transfers.findBySenderUserIdAndIdempotencyKey(user.id(), key);
            if (existing.isPresent()) return replay(existing.get(), request);
        }

        Parties parties = readTx.execute(status -> resolveParties(user, request));
        pinService.verify(user.id(), request.pin());

        Started started;
        try {
            started = writeTx.execute(status -> start(parties, request, key));
        } catch (DataIntegrityViolationException e) {
            // Hai request cùng Idempotency-Key chạy song song: request đến sau vấp UNIQUE và bị rollback toàn bộ
            // (chưa trừ tiền). Trả về kết quả của request đã thành công.
            if (key == null) throw e;
            return transfers.findBySenderUserIdAndIdempotencyKey(user.id(), key)
                    .map(t -> replay(t, request))
                    .orElseThrow(() -> e);
        }

        if (started.otp() != null) otpService.send(parties.senderPhone(), started.otp());
        return started.result();
    }

    private Parties resolveParties(AuthenticatedUser user, CreateTransferRequest request) {
        if (request.phone().equals(user.phone())) {
            throw ApiException.invalidField("phone", "Không thể chuyển tiền cho chính mình.");
        }
        Wallet sender = wallets.getByUserId(user.id());
        Wallet receiver = wallets.findByUserPhone(request.phone())
                .orElseThrow(() -> ApiException.invalidField("phone", "Số điện thoại này chưa đăng ký MiniWallet."));

        sender.ensureNotFrozen();
        // Kiểm tra sớm để báo lỗi trước khi hỏi PIN; vẫn kiểm tra lại khi trừ tiền (số dư có thể đổi trong lúc chờ)
        if (request.amount() > sender.getBalance()) {
            throw new ApiException(ErrorCode.INSUFFICIENT_BALANCE, "Số dư không đủ để thực hiện giao dịch.");
        }
        return new Parties(user.id(), user.phone(), sender.getId(), receiver.getId(), request.phone());
    }

    private Started start(Parties parties, CreateTransferRequest request, String key) {
        Instant now = clock.instant();
        // saveAndFlush: nếu trùng Idempotency-Key thì lỗi ngay tại đây, trước khi đụng tới số dư
        Transfer transfer = transfers.saveAndFlush(new Transfer(parties.senderUserId(), parties.senderWalletId(),
                parties.receiverWalletId(), parties.receiverPhone(), request.amount(), request.note(), key, now));

        if (!TransferPolicy.requiresOtp(request.amount())) {
            Transaction tx = moveMoney(transfer, now);
            return new Started(TransferResult.completed(TransactionResponse.from(tx)), null);
        }

        String otp = otpService.generate();
        transfer.issueOtp(otpService.hash(transfer.getId(), otp), now);
        return new Started(TransferResult.otpRequired(ticket(transfer, otp)), otp);
    }

    private TransferResult replay(Transfer transfer, CreateTransferRequest request) {
        if (!transfer.hasSameContent(request.phone(), request.amount(), request.note())) {
            throw new ApiException(ErrorCode.VALIDATION, "Idempotency-Key này đã được dùng cho một giao dịch khác.");
        }
        return switch (transfer.getStatus()) {
            case COMPLETED -> TransferResult.completed(loadTransaction(transfer));
            // Không trả lại mã OTP: client gửi lệnh gốc đã nhận được rồi
            case PENDING_OTP -> TransferResult.otpRequired(ticket(transfer, null));
            case CANCELLED -> throw notFound();
        };
    }

    // ---------------------------------------------------------------- Bước 2: xác nhận OTP

    /** Kết quả của transaction xác nhận. OTP sai không ném exception bên trong để bộ đếm sai được commit. */
    private sealed interface ConfirmOutcome {}

    private record Done(TransactionResponse tx) implements ConfirmOutcome {}

    private record WrongOtp(int attemptsLeft) implements ConfirmOutcome {}

    private record Cancelled() implements ConfirmOutcome {}

    public TransactionResponse confirm(Long userId, UUID transferId, String otp) {
        ConfirmOutcome outcome = writeTx.execute(status -> {
            Transfer transfer = lockOwnTransfer(userId, transferId);
            // Bấm xác nhận 2 lần: lần sau nhận lại đúng giao dịch, không chuyển thêm
            if (transfer.getStatus() == TransferStatus.COMPLETED) return new Done(loadTransaction(transfer));
            if (transfer.getStatus() != TransferStatus.PENDING_OTP) throw notFound();

            Instant now = clock.instant();
            if (transfer.isOtpExpired(now)) {
                throw new ApiException(ErrorCode.OTP_EXPIRED, "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
            }
            if (!otpService.matches(transfer.getId(), otp, transfer.getOtpHash())) {
                int left = transfer.recordWrongOtp();
                return left == 0 ? new Cancelled() : new WrongOtp(left);
            }
            return new Done(TransactionResponse.from(moveMoney(transfer, now)));
        });

        return switch (outcome) {
            case Done done -> done.tx();
            case WrongOtp wrong -> throw new ApiException(ErrorCode.OTP_INVALID,
                    "Mã OTP không đúng. Bạn còn " + wrong.attemptsLeft() + " lần thử.");
            case Cancelled cancelled -> throw new ApiException(ErrorCode.OTP_LOCKED,
                    "Bạn đã nhập sai OTP " + TransferPolicy.OTP_MAX_ATTEMPTS + " lần. Giao dịch đã bị hủy.");
        };
    }

    public OtpTicket resendOtp(AuthenticatedUser user, UUID transferId) {
        Started started = writeTx.execute(status -> {
            Transfer transfer = lockOwnTransfer(user.id(), transferId);
            if (transfer.getStatus() != TransferStatus.PENDING_OTP) throw notFound();

            Instant now = clock.instant();
            if (!transfer.canResendOtp(now)) {
                throw new ApiException(ErrorCode.TOO_SOON, "Vui lòng đợi trước khi gửi lại mã.");
            }
            String otp = otpService.generate();
            transfer.issueOtp(otpService.hash(transfer.getId(), otp), now);
            return new Started(TransferResult.otpRequired(ticket(transfer, otp)), otp);
        });
        otpService.send(user.phone(), started.otp());
        return started.result().ticket();
    }

    // ---------------------------------------------------------------- Trừ / cộng tiền

    /**
     * Trừ tiền người gửi, cộng tiền người nhận và ghi hai giao dịch. Phải chạy trong transaction.
     *
     * <p>Khóa hai ví theo thứ tự id tăng dần. Nếu A→B khóa A rồi chờ B, trong khi B→A khóa B rồi chờ A,
     * hai transaction chờ nhau mãi (deadlock). Khóa theo một thứ tự chung thì không bao giờ xảy ra.
     */
    private Transaction moveMoney(Transfer transfer, Instant now) {
        Long firstId = Math.min(transfer.getSenderWalletId(), transfer.getReceiverWalletId());
        Long secondId = Math.max(transfer.getSenderWalletId(), transfer.getReceiverWalletId());
        Wallet first = lockWallet(firstId);
        Wallet second = lockWallet(secondId);
        Wallet sender = first.getId().equals(transfer.getSenderWalletId()) ? first : second;
        Wallet receiver = sender == first ? second : first;

        // Kiểm tra lại sau khi đã khóa: trong lúc chờ OTP ví có thể bị khóa hoặc số dư đã giảm
        sender.ensureNotFrozen();
        sender.debit(transfer.getAmount());
        receiver.credit(transfer.getAmount());

        String senderName = sender.getUser().getName();
        String receiverName = receiver.getUser().getName();
        String senderPhone = sender.getUser().getPhone();

        Transaction outgoing = transactions.save(Transaction.withCounterparty(sender, Category.TRANSFER_OUT,
                "Chuyển tiền đến " + receiverName, transfer.getAmount(), transfer.getNote(), transfer.getReceiverPhone(), now));
        transactions.save(Transaction.withCounterparty(receiver, Category.TRANSFER_IN,
                "Nhận tiền từ " + senderName, transfer.getAmount(), transfer.getNote(), senderPhone, now));

        transfer.complete(outgoing.getId(), now);
        return outgoing;
    }

    private Wallet lockWallet(Long id) {
        return wallets.findByIdForUpdate(id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy ví."));
    }

    // ---------------------------------------------------------------- Tiện ích

    private Transfer lockOwnTransfer(Long userId, UUID transferId) {
        return transfers.findByIdForUpdate(transferId)
                .filter(t -> t.getSenderUserId().equals(userId))
                .orElseThrow(TransferService::notFound);
    }

    private TransactionResponse loadTransaction(Transfer transfer) {
        return transactions.findById(transfer.getTransactionId())
                .map(TransactionResponse::from)
                .orElseThrow(TransferService::notFound);
    }

    private OtpTicket ticket(Transfer transfer, String otp) {
        return new OtpTicket(transfer.getId().toString(), exposeOtp ? otp : null,
                transfer.getOtpSentAt().toEpochMilli(), transfer.getOtpExpiresAt().toEpochMilli());
    }

    private static String normalizeKey(String key) {
        if (key == null || key.isBlank()) return null;
        String trimmed = key.strip();
        if (trimmed.length() > IDEMPOTENCY_KEY_MAX) {
            throw new ApiException(ErrorCode.VALIDATION, "Idempotency-Key tối đa " + IDEMPOTENCY_KEY_MAX + " ký tự.");
        }
        return trimmed;
    }

    private static ApiException notFound() {
        return new ApiException(ErrorCode.NOT_FOUND, "Giao dịch không tồn tại hoặc đã bị hủy.");
    }
}
