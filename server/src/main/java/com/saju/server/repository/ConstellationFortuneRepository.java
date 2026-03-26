package com.saju.server.repository;

import com.saju.server.entity.ConstellationFortune;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface ConstellationFortuneRepository extends JpaRepository<ConstellationFortune, Long> {
    Optional<ConstellationFortune> findBySignAndFortuneDate(String sign, LocalDate date);
}
