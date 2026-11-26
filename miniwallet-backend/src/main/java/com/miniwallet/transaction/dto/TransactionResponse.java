package com.miniwallet.transaction.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.miniwallet.transaction.Category;
import com.miniwallet.transaction.Transaction;
import com.miniwallet.transaction.TransactionType;
import java.time.Instant;

/** Cùng hình dạng với {@code Transaction} của frontend. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TransactionResponse(
        String id,
        TransactionType type,
        Category category,
        String title,
        long amount,
        String phone,
        String note,
        String bankAccount,
        String status,
        Instant createdAt) {

    public static TransactionResponse from(Transaction t) {
        return new TransactionResponse(t.getId().toString(), t.getType(), t.getCategory(), t.getTitle(), t.getAmount(),
                t.getCounterpartyPhone(), t.getNote(), t.getBankAccountMasked(), "success", t.getCreatedAt());
    }
}
