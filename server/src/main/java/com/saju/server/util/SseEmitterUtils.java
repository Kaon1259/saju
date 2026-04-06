package com.saju.server.util;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public class SseEmitterUtils {

    public static SseEmitter insufficientHearts(int required, int available) {
        SseEmitter emitter = new SseEmitter(5000L);
        new Thread(() -> {
            try {
                String json = String.format("{\"required\":%d,\"available\":%d}", required, available);
                emitter.send(SseEmitter.event().name("insufficient_hearts").data(json));
                emitter.complete();
            } catch (Exception ignored) {}
        }).start();
        return emitter;
    }

    public static SseEmitter errorEmitter(String message) {
        SseEmitter emitter = new SseEmitter(5000L);
        new Thread(() -> {
            try {
                emitter.send(SseEmitter.event().name("error").data(message));
                emitter.complete();
            } catch (Exception ignored) {}
        }).start();
        return emitter;
    }
}
