-- 为 boss_info 增加异常条系数；最大异常积蓄 = 基础异常条 × 系数；空按 1 处理
--
-- 仅 boss_info 需要该列（怪物库属性，boss 表不按期数存列）。
-- 一次性执行；服务启动时 ensureBossAnomalySchema() 也会按 information_schema
-- 检查后幂等补列，所以漏跑此文件不会导致功能缺失，只会在首次访问时补一次 DDL。
-- （MySQL 不支持 ADD COLUMN IF NOT EXISTS，故用裸 ADD COLUMN，重复执行会报 1060。）

USE zzz;

ALTER TABLE `boss_info`
  ADD COLUMN `anomaly_bar_coefficient` DECIMAL(6,4) NULL
    COMMENT '异常条系数；最大异常积蓄 = 基础异常条 × 系数；空按 1 处理'
    AFTER `stagger_time`;
