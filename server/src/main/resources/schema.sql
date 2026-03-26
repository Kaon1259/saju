-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: saju_db
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bloodtype_fortune`
--

DROP TABLE IF EXISTS `bloodtype_fortune`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bloodtype_fortune` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `blood_type` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `day_analysis` text COLLATE utf8mb4_unicode_ci,
  `fortune_date` date NOT NULL,
  `health` text COLLATE utf8mb4_unicode_ci,
  `love` text COLLATE utf8mb4_unicode_ci,
  `lucky_color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lucky_number` int DEFAULT NULL,
  `money` text COLLATE utf8mb4_unicode_ci,
  `overall` text COLLATE utf8mb4_unicode_ci,
  `personality` text COLLATE utf8mb4_unicode_ci,
  `score` int DEFAULT NULL,
  `work` text COLLATE utf8mb4_unicode_ci,
  `zodiac_animal` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKh8cgu3f4nh9mwe4un3d1ptyl` (`blood_type`,`zodiac_animal`,`fortune_date`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `constellation_fortune`
--

DROP TABLE IF EXISTS `constellation_fortune`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `constellation_fortune` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `fortune_date` date NOT NULL,
  `health` text COLLATE utf8mb4_unicode_ci,
  `love` text COLLATE utf8mb4_unicode_ci,
  `lucky_color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lucky_number` int DEFAULT NULL,
  `money` text COLLATE utf8mb4_unicode_ci,
  `overall` text COLLATE utf8mb4_unicode_ci,
  `score` int DEFAULT NULL,
  `sign` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKh99p6bueaplbmx09a0ibd8jlv` (`sign`,`fortune_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `daily_fortune`
--

DROP TABLE IF EXISTS `daily_fortune`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_fortune` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `fortune_date` date NOT NULL,
  `health` text COLLATE utf8mb4_unicode_ci,
  `love` text COLLATE utf8mb4_unicode_ci,
  `lucky_color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lucky_number` int DEFAULT NULL,
  `money` text COLLATE utf8mb4_unicode_ci,
  `overall` text COLLATE utf8mb4_unicode_ci,
  `score` int DEFAULT NULL,
  `work` text COLLATE utf8mb4_unicode_ci,
  `zodiac_animal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKouu6xak1aayn4s5fil6e6y3o6` (`zodiac_animal`,`fortune_date`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mbti_fortune`
--

DROP TABLE IF EXISTS `mbti_fortune`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mbti_fortune` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `fortune_date` date NOT NULL,
  `love` text COLLATE utf8mb4_unicode_ci,
  `lucky_color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lucky_number` int DEFAULT NULL,
  `mbti_type` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `overall` text COLLATE utf8mb4_unicode_ci,
  `personality` text COLLATE utf8mb4_unicode_ci,
  `score` int DEFAULT NULL,
  `tip` text COLLATE utf8mb4_unicode_ci,
  `work` text COLLATE utf8mb4_unicode_ci,
  `zodiac_animal` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK929n9kwkpol0po765fte6ksqx` (`mbti_type`,`zodiac_animal`,`fortune_date`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `birth_date` date NOT NULL,
  `birth_time` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `gender` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zodiac_animal` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `calendar_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `blood_type` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mbti_type` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-26 23:51:20
