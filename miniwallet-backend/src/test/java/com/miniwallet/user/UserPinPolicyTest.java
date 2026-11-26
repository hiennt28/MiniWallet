package com.miniwallet.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/** Luật khóa PIN là code Java thuần trong entity, nên test được mà không cần Spring hay database. */
class UserPinPolicyTest {

    private static final Instant T0 = Instant.parse("2026-11-26T08:00:00Z");

    private User newUser() {
        return User.register("An", "0912345678", "hash", T0);
    }

    @Test
    void locksAfterFiveFailures() {
        User user = newUser();
        for (int i = 1; i <= 4; i++) {
            assertThat(user.recordPinFailure(T0)).isFalse();
            assertThat(user.pinAttemptsLeft()).isEqualTo(5 - i);
        }
        assertThat(user.recordPinFailure(T0)).isTrue();
        assertThat(user.isPinLocked(T0)).isTrue();
        assertThat(user.isPinLocked(T0.plus(Duration.ofMinutes(4)))).isTrue();
        assertThat(user.isPinLocked(T0.plus(Duration.ofMinutes(5)))).isFalse();
    }

    @Test
    void successResetsCounter() {
        User user = newUser();
        user.recordPinFailure(T0);
        user.recordPinFailure(T0);
        user.recordPinSuccess();
        assertThat(user.getFailedPinAttempts()).isZero();
        assertThat(user.pinAttemptsLeft()).isEqualTo(User.MAX_PIN_ATTEMPTS);
    }

    @Test
    void countingRestartsAfterLockExpires() {
        User user = newUser();
        for (int i = 0; i < 5; i++) user.recordPinFailure(T0);

        Instant later = T0.plus(Duration.ofMinutes(6));
        assertThat(user.recordPinFailure(later)).isFalse();
        assertThat(user.isPinLocked(later)).isFalse();
        assertThat(user.pinAttemptsLeft()).isEqualTo(4);
    }

    @Test
    void minutesLeftRoundsUp() {
        User user = newUser();
        for (int i = 0; i < 5; i++) user.recordPinFailure(T0);

        assertThat(user.pinLockMinutesLeft(T0)).isEqualTo(5);
        assertThat(user.pinLockMinutesLeft(T0.plusSeconds(61))).isEqualTo(4);
        assertThat(user.pinLockMinutesLeft(T0.plusSeconds(299))).isEqualTo(1);
        assertThat(user.pinLockMinutesLeft(T0.plusSeconds(300))).isZero();
    }
}
