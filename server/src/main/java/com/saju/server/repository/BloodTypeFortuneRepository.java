package com.saju.server.repository;

import com.saju.server.entity.BloodTypeFortune;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BloodTypeFortuneRepository extends JpaRepository<BloodTypeFortune, Long> {
    Optional<BloodTypeFortune> findByBloodTypeAndZodiacAnimalAndFortuneDate(String bloodType, String zodiacAnimal, LocalDate date);
    List<BloodTypeFortune> findByFortuneDateAndZodiacAnimal(LocalDate date, String zodiacAnimal);
    List<BloodTypeFortune> findByFortuneDate(LocalDate date);
}
