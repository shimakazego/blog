import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSharedSchemeRows,
  sharedSchemeId,
} from '../src/services/sharedSchemeService.js'

function packWith(schemes, extra = {}) {
  return {
    type: 'zzz-hp-schemes',
    version: 4,
    schemes,
    customSkills: [
      { id: 'custom-a', name: '测试招式A', source: 'custom' },
      { id: 'custom-b', name: '测试招式B', source: 'custom' },
      { id: 'custom-unused', name: '未引用', source: 'custom' },
    ],
    skillGroups: [
      { id: 'grp-a', name: '测试组', members: [{ skillId: 'custom-a', order: 0, count: 1 }] },
      { id: 'grp-unused', name: '未引用组', members: [] },
    ],
    ...extra,
  }
}

test('共用方案：稳定 id + 只带该方案引用的依赖', () => {
  const pack = packWith({
    '/测试/方案A': {
      id: '/测试/方案A',
      name: '方案A',
      folder: '/测试',
      slots: [
        {
          prepared: [
            { id: 'p1', skillId: 'custom-a', skillSource: 'custom', skillGroupId: 'grp-a' },
            { id: 'p2', skillId: 'lib-skill', skillSource: 'preset' },
          ],
          flow: [{ memberOverrides: [{ skillId: 'custom-b' }] }],
        },
      ],
    },
    '/方案B': {
      id: '/方案B',
      name: '方案B',
      folder: '',
      slots: [{ prepared: [{ id: 'p3', skillId: 'lib-skill', skillSource: 'preset' }] }],
    },
  })

  const { rows, skipped } = buildSharedSchemeRows(pack)
  assert.equal(skipped, 0)
  assert.equal(rows.length, 2)

  const a = rows.find((row) => row.name === '方案A')
  assert.ok(a)
  assert.equal(a.id, sharedSchemeId('/测试', '方案A'))
  assert.deepEqual(
    a.dependencies.customSkills.map((item) => item.id).sort(),
    ['custom-a', 'custom-b'],
  )
  assert.deepEqual(a.dependencies.skillGroups.map((item) => item.id), ['grp-a'])

  const b = rows.find((row) => row.name === '方案B')
  assert.equal(b.dependencies.customSkills.length, 0)
  assert.equal(b.dependencies.skillGroups.length, 0)
})

test('共用方案：同目录同名条目 id 不冲突', () => {
  const pack = packWith({
    '/重复/同名': { id: '/重复/同名', name: '同名', folder: '/重复', slots: [] },
    '/重复/同名-2': { id: '/重复/同名-2', name: '同名', folder: '/重复', slots: [] },
  })
  const { rows } = buildSharedSchemeRows(pack)
  assert.equal(rows.length, 2)
  assert.notEqual(rows[0].id, rows[1].id)
  assert.equal(rows[0].id, sharedSchemeId('/重复', '同名'))
})

test('共用方案：非方案库导出包直接拒绝', () => {
  assert.throws(() => buildSharedSchemeRows({ type: 'other', schemes: {} }), /zzz-hp-schemes/)
  assert.throws(() => buildSharedSchemeRows({ type: 'zzz-hp-schemes', schemes: {} }), /没有方案/)
})

test('共用方案：sharedSchemeId 对目录/名称稳定', () => {
  assert.equal(sharedSchemeId('/a', 'b'), sharedSchemeId('/a/', ' b '))
  assert.notEqual(sharedSchemeId('/a', 'b'), sharedSchemeId('/a', 'c'))
})
test('共用方案（2026-10-30）：旧个人方案包入库前转成属性异常新名', () => {
  const oldPack = packWith({
    '/旧/方案': {
      id: '/旧/方案',
      name: '旧方案',
      folder: '/旧',
      slots: [{ prepared: [], flow: [] }],
      customSkills: [
        {
          id: 'custom-old',
          name: '属性异常招式',
          source: 'custom',
          damageType: 'anomaly',
          note: '原文：属性异常伤害提升30%。\n[关键字] 属性=异常增伤 元素=无 动作=提升 数值=30 单位=%',
        },
      ],
      panelState: {
        externalPanel: { anomalyDmgBonus: 30, anomalyCritRate: 20, anomalyCritDmg: 50, anomalyMult: 100, anomalyMultFactor: 100 },
        extraGains: [
          {
            id: 'gain-1',
            effects: [
              { id: 'e1', kind: 'fixed', stat: 'anomalyDmgBonus', value: 15, scope: ['anomaly'] },
            ],
          },
        ],
      },
    },
  })
  const { rows } = buildSharedSchemeRows(oldPack)
  assert.equal(rows.length, 1)
  const text = JSON.stringify(rows[0])
  // 旧字段名 / 旧类型值 / 旧生成行属性槽位都不得入库
  for (const legacy of ['"anomalyDmgBonus"', '"anomalyCritRate"', '"anomalyCritDmg"', '"anomalyMult"', '"anomalyMultFactor"']) {
    assert.equal(text.includes(legacy), false, `不应残留 ${legacy}`)
  }
  assert.equal(text.includes('"damageType":"anomaly"'), false, '子类类型值应为 attributeAnomaly')
  assert.equal(text.includes('属性=异常增伤'), false, '生成行属性槽位应换成新名')
  // 新名与新槽位都在，且数值不变
  assert.equal(rows[0].payload.panelState.externalPanel.attributeAnomalyDmgBonus, 30)
  assert.equal(rows[0].payload.panelState.externalPanel.attributeAnomalyMult, 100)
  assert.equal(rows[0].payload.customSkills[0].damageType, 'attributeAnomaly')
  assert.ok(rows[0].payload.customSkills[0].note.includes('属性=属性异常增伤'))
  assert.equal(rows[0].payload.panelState.extraGains[0].effects[0].stat, 'attributeAnomalyDmgBonus')
  assert.ok(text.includes('"attributeAnomalyDmgBonus"'))
})

test('共用方案（2026-10-30）：已转换的包再入库不变（幂等）', () => {
  const pack = packWith({
    '/新/方案': {
      id: '/新/方案',
      name: '新方案',
      folder: '/新',
      slots: [],
      panelState: { externalPanel: { attributeAnomalyDmgBonus: 20 } },
    },
  })
  const first = buildSharedSchemeRows(pack).rows[0]
  const second = buildSharedSchemeRows({ ...pack, schemes: { '/新/方案': first.payload } }).rows[0]
  assert.deepEqual(second.payload, first.payload)
})