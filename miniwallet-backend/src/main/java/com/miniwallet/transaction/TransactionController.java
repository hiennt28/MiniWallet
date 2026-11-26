package com.miniwallet.transaction;

import com.miniwallet.common.PageResponse;
import com.miniwallet.common.security.AuthenticatedUser;
import com.miniwallet.transaction.dto.TransactionQuery;
import com.miniwallet.transaction.dto.TransactionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
@Tag(name = "Transactions", description = "Lịch sử giao dịch")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    @Operation(summary = "Lịch sử giao dịch: lọc theo loại, danh mục, khoảng ngày, tìm không dấu, phân trang")
    public PageResponse<TransactionResponse> search(@AuthenticationPrincipal AuthenticatedUser user,
                                                    @Valid @ParameterObject TransactionQuery query) {
        return transactionService.search(user.id(), query);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết một giao dịch")
    public TransactionResponse get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        return transactionService.get(user.id(), id);
    }
}
