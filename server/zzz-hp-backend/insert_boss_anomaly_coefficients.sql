-- 按怪物名回填 boss_info.anomaly_bar_coefficient（异常条系数）
--
-- 注意：此处名称以本文件写死的拼写为准，可能与库内实际名称不完全一致
-- （例如带不带「」括号、「思路/死路」等近似写法）。执行后务必运行文件末尾的
-- 验证 SELECT，逐行核对 boss_name / anomaly_bar_coefficient；凡系数为 NULL 的
-- 行即未匹配上，请按库内真实名称修正对应 UPDATE 后重跑。

USE zzz;

UPDATE boss_info
SET anomaly_bar_coefficient = CASE boss_name
  WHEN '死路屠夫' THEN 1.0
  WHEN '未知复合侵蚀体' THEN 1.0
  WHEN '「霸主侵蚀体·庞培」' THEN 1.1
  WHEN '牲鬼·布林格' THEN 1.1
  WHEN '恶名·冥宁芙' THEN 1.1
  WHEN '自律强袭单位·「提丰·破坏者型」' THEN 1.1
  WHEN '恶名·死路屠夫' THEN 1.1
  WHEN '恶名·庞培' THEN 1.1
  WHEN '秽息司祭' THEN 1.2
  WHEN '秽息妖鬼·名可名' THEN 1.2
  WHEN '「亵渎者」' THEN 1.32
  WHEN '魇缚者·叶释渊' THEN 1.32
  WHEN '彷徨猎手' THEN 1.38
  WHEN '太初梦魇·「始主」' THEN 1.5
  WHEN '叛律孤歌·薇斯珀' THEN 1.25
  WHEN '异变能量体' THEN 1.25
  WHEN '猎血清道夫' THEN 1.0625
  WHEN '基塔布鲁' THEN 1.3
END
WHERE boss_name IN (
  '死路屠夫',
  '未知复合侵蚀体',
  '「霸主侵蚀体·庞培」',
  '牲鬼·布林格',
  '恶名·冥宁芙',
  '自律强袭单位·「提丰·破坏者型」',
  '恶名·死路屠夫',
  '恶名·庞培',
  '秽息司祭',
  '秽息妖鬼·名可名',
  '「亵渎者」',
  '魇缚者·叶释渊',
  '彷徨猎手',
  '太初梦魇·「始主」',
  '叛律孤歌·薇斯珀',
  '异变能量体',
  '猎血清道夫',
  '基塔布鲁'
);

-- 验证：凡 anomaly_bar_coefficient 为 NULL 的行即未按名称匹配上，需人工修正后重跑
SELECT boss_name, anomaly_bar_coefficient
FROM boss_info
WHERE boss_name IN (
  '死路屠夫',
  '未知复合侵蚀体',
  '「霸主侵蚀体·庞培」',
  '牲鬼·布林格',
  '恶名·冥宁芙',
  '自律强袭单位·「提丰·破坏者型」',
  '恶名·死路屠夫',
  '恶名·庞培',
  '秽息司祭',
  '秽息妖鬼·名可名',
  '「亵渎者」',
  '魇缚者·叶释渊',
  '彷徨猎手',
  '太初梦魇·「始主」',
  '叛律孤歌·薇斯珀',
  '异变能量体',
  '猎血清道夫',
  '基塔布鲁'
)
ORDER BY boss_name;
