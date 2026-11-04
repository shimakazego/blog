/** 将重新计算的招式计划限制为用户在预览中明确勾选的项。 */
export function selectReviewedNanokaSkills(plan, selection) {
  if (selection == null) return plan // 兼容已有调用方。
  if (!Array.isArray(selection)) throw new Error('招式勾选项必须是数组')
  const creates = new Map(plan.create.map((item) => [String(item.id), item]))
  const overwrites = new Map(plan.overwrite.map((item) => [String(item.id), item]))
  const alreadySame = new Set(plan.skipSame.map((item) => String(item.id)))
  const selectedCreate = []
  const selectedOverwrite = []
  const seen = new Set()
  for (const item of selection) {
    const id = String(item?.id ?? '')
    if (!id || !['create', 'overwrite'].includes(item?.action) || seen.has(id)) {
      throw new Error('招式勾选项无效或重复，请重新预览')
    }
    seen.add(id)
    if (alreadySame.has(id)) continue
    const current = item.action === 'create' ? creates.get(id) : overwrites.get(id)
    if (!current) throw new Error(`招式 ${id} 的状态已变化，请重新采集预览`)
    if (item.action === 'create') {
      selectedCreate.push(current)
      continue
    }
    if (!item.expect || typeof item.expect !== 'object') throw new Error('覆盖招式缺少预览旧值，请重新预览')
    for (const field of ['baseMult', 'damagePercentage', 'damagePercentageGrowth', 'multSource']) {
      if ((item.expect[field] ?? null) !== (current.expect?.[field] ?? null)) {
        throw new Error(`招式「${current.name}」的库值已变化，请重新采集预览`)
      }
    }
    selectedOverwrite.push(current)
  }
  return { ...plan, create: selectedCreate, overwrite: selectedOverwrite }
}
