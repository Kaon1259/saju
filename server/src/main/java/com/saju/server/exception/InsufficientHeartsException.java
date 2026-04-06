package com.saju.server.exception;

import lombok.Getter;

@Getter
public class InsufficientHeartsException extends RuntimeException {

    private final int required;
    private final int available;

    public InsufficientHeartsException(int required, int available) {
        super("하트가 부족합니다. 필요: " + required + ", 보유: " + available);
        this.required = required;
        this.available = available;
    }
}
