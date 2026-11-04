-- MySQL dump 10.13  Distrib 9.2.0, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: zzz
-- ------------------------------------------------------
-- Server version	9.2.0

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
-- Table structure for table `date`
--

DROP TABLE IF EXISTS `date`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `date` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `mode` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'crisis' COMMENT 'crisis|defense',
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '版本',
  `phase` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '阶段',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_mode_version_phase` (`mode`,`version`,`phase`)
) ENGINE=InnoDB AUTO_INCREMENT=326 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日期表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `date`
--

LOCK TABLES `date` WRITE;
/*!40000 ALTER TABLE `date` DISABLE KEYS */;
INSERT INTO `date` VALUES (141,'crisis','1.4','1','2024-12-20','2025-01-10'),(142,'crisis','1.4','2','2025-01-10','2025-01-24'),(151,'crisis','1.5','1','2025-01-24','2025-02-07'),(152,'crisis','1.5','2','2025-02-07','2025-02-21'),(153,'crisis','1.5','3','2025-02-21','2025-03-07'),(154,'crisis','1.5','4','2025-03-07','2025-03-20'),(161,'crisis','1.6','1','2025-03-21','2025-04-04'),(162,'crisis','1.6','2','2025-04-04','2025-04-18'),(163,'crisis','1.6','3','2025-04-18','2025-05-02'),(171,'crisis','1.7','1','2025-05-02','2025-05-16'),(172,'crisis','1.7','2','2025-05-16','2025-05-30'),(173,'crisis','1.7','3','2025-05-30','2025-06-13'),(201,'crisis','2.0','1','2025-06-13','2025-06-27'),(202,'crisis','2.0','2','2025-06-27','2025-07-11'),(203,'crisis','2.0','3','2025-07-11','2025-07-25'),(211,'crisis','2.1','1','2025-07-25','2025-08-08'),(212,'crisis','2.1','2','2025-08-08','2025-08-22'),(213,'crisis','2.1','3','2025-08-22','2025-09-05'),(221,'crisis','2.2','1','2025-09-05','2025-09-19'),(222,'crisis','2.2','2','2025-09-19','2025-10-03'),(223,'crisis','2.2','3','2025-10-03','2025-10-17'),(231,'crisis','2.3','1','2025-10-17','2025-10-31'),(232,'crisis','2.3','2','2025-10-31','2025-11-14'),(233,'crisis','2.3','3','2025-11-14','2025-11-28'),(241,'crisis','2.4','1','2025-11-28','2025-12-12'),(242,'crisis','2.4','2','2025-12-12','2026-01-02'),(251,'crisis','2.5','1','2026-01-02','2026-01-16'),(252,'crisis','2.5','2','2026-01-16','2026-01-30'),(253,'crisis','2.5','3','2026-01-30','2026-02-13'),(261,'crisis','2.6','1','2026-02-13','2026-02-27'),(262,'crisis','2.6','2','2026-02-27','2026-03-13'),(263,'crisis','2.6','3','2026-03-13','2026-03-27'),(271,'crisis','2.7','1','2026-03-27','2026-04-10'),(272,'crisis','2.7','2','2026-04-10','2026-04-24'),(273,'crisis','2.7','3','2026-04-24','2026-05-08'),(281,'crisis','2.8','1','2026-05-08','2026-05-22'),(282,'crisis','2.8','2','2026-05-22','2026-06-05'),(283,'crisis','2.8','3','2026-06-05','2026-06-19'),(301,'crisis','3.0','1','2026-06-19','2026-07-03'),(302,'crisis','3.0','2','2026-07-03','2026-07-17'),(303,'crisis','3.0','3','2026-07-17','2026-07-29'),(304,'crisis','3.1','1','2026-07-29','2026-08-14'),(305,'defense','2.4','1','2025-12-05','2025-12-19'),(306,'defense','2.4','2','2025-12-19','2025-12-29'),(307,'defense','2.5','1','2025-12-30','2026-01-09'),(308,'defense','2.5','2','2026-01-09','2026-01-23'),(309,'defense','2.5','3','2026-01-23','2026-02-06'),(310,'defense','2.6','1','2026-02-06','2026-02-20'),(311,'defense','2.6','2','2026-02-20','2026-03-06'),(312,'defense','2.6','3','2026-03-06','2026-03-20'),(313,'defense','2.6','4','2026-03-20','2026-04-03'),(314,'defense','2.7','1','2026-04-03','2026-04-17'),(315,'defense','2.7','2','2026-04-17','2026-05-01'),(316,'defense','2.7','3','2026-05-01','2026-05-15'),(317,'defense','2.8','1','2026-05-15','2026-05-29'),(318,'defense','2.8','2','2026-05-29','2026-06-12'),(319,'defense','2.8','3','2026-06-12','2026-06-26'),(320,'defense','3.0','1','2026-06-26','2026-07-10'),(321,'defense','3.0','2','2026-07-10','2026-07-24'),(322,'defense','3.0','3','2026-07-24','2026-08-07'),(324,'defense','3.1','1','2026-08-07','2026-08-21'),(325,'crisis','3.1','2','2026-08-14','2026-08-28');
/*!40000 ALTER TABLE `date` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-07  1:31:09
