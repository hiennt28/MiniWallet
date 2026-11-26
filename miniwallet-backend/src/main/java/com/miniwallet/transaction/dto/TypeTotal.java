package com.miniwallet.transaction.dto;

import com.miniwallet.transaction.TransactionType;

public record TypeTotal(TransactionType type, Long total) {}
