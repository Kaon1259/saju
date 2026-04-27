package com.saju.server.repository;

import com.saju.server.entity.ZodiacFortune;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface ZodiacFortuneRepository extends JpaRepository<ZodiacFortune, Long> {
    Optional<ZodiacFortune> findByAnimalAndFortuneDate(String animal, LocalDate date);
}
