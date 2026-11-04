import test from 'node:test'
import assert from 'node:assert/strict'
import { selectReviewedNanokaSkills } from '../src/utils/nanokaSkillReview.js'

function fixture() {
  return {
    create: [{ id: 'new-1', name: '新增一' }, { id: 'new-2', name: '新增二' }],
    overwrite: [{ id: 'old-1', name: '已有招式', expect: { baseMult: 100, damagePercentage: 20, damagePercentageGrowth: 5, multSource: 'nanoka' }, doc: { note: '人工备注', element: 'electric', baseMult: 120 } }],
    skipSame: [{ id: 'same-1' }], existingManual: [{ id: 'manual-1' }], unmatchedLocal: [],
  }
}

test('旧调用兼容；明确空选不写入任何新建或覆盖', () => {
  const plan = fixture()
  assert.equal(selectReviewedNanokaSkills(plan, undefined), plan)
  const selected = selectReviewedNanokaSkills(plan, [])
  assert.deepEqual(selected.create, [])
  assert.deepEqual(selected.overwrite, [])
})

test('仅返回勾选项，不把重算时发现的其它新增一起写入', () => {
  const plan = fixture()
  const selected = selectReviewedNanokaSkills(plan, [{ id: 'new-2', action: 'create' }])
  assert.deepEqual(selected.create, [plan.create[1]])
  assert.deepEqual(selected.overwrite, [])
  assert.equal(plan.create.length, 2, '不改变原计划')
})

test('覆盖核对预览倍率，同时保留重算时最新的人工字段', () => {
  const plan = fixture()
  const selection = [{ id: 'old-1', action: 'overwrite', expect: { ...plan.overwrite[0].expect } }]
  plan.overwrite[0].doc.note = '预览后更新的备注'
  const selected = selectReviewedNanokaSkills(plan, selection)
  assert.equal(selected.overwrite[0].doc.note, '预览后更新的备注')
  assert.equal(selected.overwrite[0].doc.element, 'electric')
})

test('四个倍率字段任意变化都会拒绝整份选择，防止过期覆盖', () => {
  for (const field of ['baseMult', 'damagePercentage', 'damagePercentageGrowth', 'multSource']) {
    const plan = fixture()
    const expect = { ...plan.overwrite[0].expect }
    expect[field] = field === 'multSource' ? 'manual' : -1
    assert.throws(() => selectReviewedNanokaSkills(plan, [
      { id: 'new-1', action: 'create' }, { id: 'old-1', action: 'overwrite', expect },
    ]), /库值已变化/)
  }
})

test('预览为新增、重算已变成覆盖时不自动覆盖', () => {
  assert.throws(() => selectReviewedNanokaSkills(fixture(), [{ id: 'old-1', action: 'create' }]), /状态已变化/)
})

test('部分成功后重试，已一致项跳过，其余仍可处理', () => {
  const selected = selectReviewedNanokaSkills(fixture(), [
    { id: 'same-1', action: 'create' }, { id: 'new-1', action: 'create' },
  ])
  assert.deepEqual(selected.create.map((item) => item.id), ['new-1'])
})

test('拒绝重复、未知、无旧值和格式错误的勾选项', () => {
  for (const selection of [
    {}, [null], [{ id: 'new-1', action: 'delete' }],
    [{ id: 'new-1', action: 'create' }, { id: 'new-1', action: 'create' }],
    [{ id: 'unknown', action: 'create' }], [{ id: 'old-1', action: 'overwrite' }],
  ]) assert.throws(() => selectReviewedNanokaSkills(fixture(), selection))
})
