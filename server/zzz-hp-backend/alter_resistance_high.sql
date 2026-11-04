-- 为 boss / boss_info 增加高抗性属性（40%）；为 resistance 的子集，空则全部按 20% 处理
--
-- 一次性执行；服务启动时 ensureBossResistanceSchema() 也会按 information_schema
-- 检查后幂等补列，所以漏跑此文件不会导致功能缺失，只会在首次访问时补一次 DDL。
-- （MySQL 不支持 ADD COLUMN IF NOT EXISTS，故用裸 ADD COLUMN，重复执行会报 1060。）

USE zzz;

ALTER TABLE `boss_info`
  ADD COLUMN `resistance_high` VARCHAR(255) NULL
    COMMENT '高抗性属性（40%）；为 resistance 的子集'
    AFTER `resistance`;

ALTER TABLE `boss`
  ADD COLUMN `resistance_high` VARCHAR(255) NULL
    COMMENT '高抗性属性（40%）；为 resistance 的子集；空则回退 boss_info'
    AFTER `resistance`;
