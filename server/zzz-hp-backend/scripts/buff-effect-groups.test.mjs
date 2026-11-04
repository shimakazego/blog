/**
 * BuffEffect 数据层：groupId + conditions（伤害类型）归一化。
 *
 * 2026-10-20 用户口径：
 * - scope 只针对 BuffEffect 废弃；读时迁移为 conditions.damageTypes，写出口不再写 scope；
 * - 15 个异常子类 stat 类型已由字段表达，不写冗余 conditions；
 * - groupId 只用于管理侧聚合，后端原样保留、引擎不读。
 *
 * 本文件只测纯函数，不连数据库。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEffectList,
  normalizeSelfTeamBuffs,
} from '../src/services/calculatorBuffService.js'

function one(value) {
  const list = normalizeEffectList([value])
  assert.equal(list.length, 1)
  return list[0]
}

test('旧 scope=attributeAnomaly → conditions.damageTypes，不再输出 scope', () => {
  const effect = one({ id: 'a', stat: 'dmgBonus', scope: ['attributeAnomaly'], value: 10 })
  assert.deepEqual(effect.conditions, { damageTypes: ['attributeAnomaly'] })
  assert.equal('scope' in effect, false)
})

test('scope=general / 缺省 → 不写 conditions', () => {
  assert.equal(one({ id: 'a', stat: 'dmgBonus', scope: ['general'] }).conditions, undefined)
  assert.equal(one({ id: 'b', stat: 'dmgBonus' }).conditions, undefined)
  assert.equal(one({ id: 'c', stat: 'dmgBonus', scope: null }).conditions, undefined)
})

test('scope=skill 只保留 skillTargets，不产伤害类型条件', () => {
  const effect = one({
    id: 'a',
    stat: 'skillDmgBonus',
    scope: ['skill'],
    skillTargets: [{ category: 'basic', subcategoryId: null }],
  })
  assert.equal(effect.conditions, undefined)
  assert.deepEqual(effect.skillTargets, [{ category: 'basic', subcategoryId: null }])
  assert.equal('scope' in effect, false)
})

test('scope=mutation → 5 个异常类全选（固定顺序）', () => {
  const effect = one({ id: 'a', stat: 'mutationCoeff', scope: ['mutation'] })
  assert.deepEqual(effect.conditions.damageTypes, [
    'attributeAnomaly',
    'turbulence',
    'disorder',
    'radiance',
    'anomalyRelease',
  ])
})

test('多 scope 并集 / 去重 / 非法值剔除 / 固定顺序', () => {
  const effect = one({
    id: 'a',
    stat: 'dmgBonus',
    scope: ['radiance', 'attributeAnomaly', 'attributeAnomaly', 'bogus'],
  })
  assert.deepEqual(effect.conditions.damageTypes, ['attributeAnomaly', 'radiance'])
})

test('新 conditions 优先于旧 scope', () => {
  const effect = one({
    id: 'a',
    stat: 'atk',
    scope: ['attributeAnomaly'],
    conditions: { damageTypes: ['pierce', 'normal', 'pierce'] },
  })
  assert.deepEqual(effect.conditions.damageTypes, ['normal', 'pierce'])
})

test('异常子类 stat 不写冗余 conditions（15 个字段）', () => {
  const stats = [
    'attributeAnomalyDmgBonus',
    'turbulenceDmgBonus',
    'disorderDmgBonus',
    'radianceDmgBonus',
    'anomalyReleaseDmgBonus',
    'attributeAnomalyCritRate',
    'turbulenceCritRate',
    'disorderCritRate',
    'radianceCritRate',
    'anomalyReleaseCritRate',
    'attributeAnomalyCritDmg',
    'turbulenceCritDmg',
    'disorderCritDmg',
    'radianceCritDmg',
    'anomalyReleaseCritDmg',
  ]
  for (const stat of stats) {
    const effect = one({
      id: stat,
      stat,
      value: 1,
      conditions: { damageTypes: ['attributeAnomaly'] },
      scope: ['attributeAnomaly'],
    })
    assert.equal(effect.conditions, undefined, `${stat} 不应写 conditions`)
  }
})

test('groupId：保留、去空白、空值/非法值丢弃', () => {
  assert.equal(one({ id: 'a', stat: 'dmgBonus', groupId: ' grp-1 ' }).groupId, 'grp-1')
  assert.equal(one({ id: 'b', stat: 'dmgBonus', groupId: '   ' }).groupId, undefined)
  assert.equal(one({ id: 'c', stat: 'dmgBonus', groupId: 123 }).groupId, undefined)
})

test('normalizeSelfTeamBuffs：块内 groupId/conditions 保留，effects 展开一致', () => {
  const pack = normalizeSelfTeamBuffs({
    effectBlocks: [
      {
        id: 'blk-1',
        name: '块',
        effects: [
          { id: 'a', stat: 'attributeAnomalyDmgBonus', value: 12, groupId: 'grp-1' },
          { id: 'b', stat: 'disorderDmgBonus', value: 12, groupId: 'grp-1' },
          { id: 'c', stat: 'atk', value: 30, conditions: { damageTypes: ['pierce'] } },
          { id: 'd', stat: 'dmgBonus', value: 10 },
        ],
      },
    ],
  })
  assert.equal(pack.effects.length, 4)
  assert.equal(pack.effects[0].groupId, 'grp-1')
  assert.equal(pack.effects[1].groupId, 'grp-1')
  assert.deepEqual(pack.effects[2].conditions, { damageTypes: ['pierce'] })
  // 扁平增量表只收「通用」效果：带伤害类型条件的 atk 不进；异常子类 stat 无条件是通用，进。
  assert.equal(pack.selfMods.attributeAnomalyDmgBonus, 12)
  assert.equal(pack.selfMods.disorderDmgBonus, 12)
  assert.equal(pack.selfMods.dmgBonus, 10)
  assert.equal(pack.selfMods.atk, 0)
})

test('旧数据：scope=attributeAnomaly 的 dmgBonus 不再进扁平增量表', () => {
  const pack = normalizeSelfTeamBuffs({
    effects: [{ id: 'a', stat: 'dmgBonus', value: 10, scope: ['attributeAnomaly'] }],
  })
  assert.equal(pack.selfMods.dmgBonus, 0)
  assert.deepEqual(pack.effects[0].conditions, { damageTypes: ['attributeAnomaly'] })
})

test('叠层 / 转模字段归一化不受条件改造影响', () => {
  const stacked = one({
    id: 's',
    stat: 'critDmg',
    kind: 'stacked',
    valuePerStack: 5,
    maxStacks: 6,
    defaultStacks: 6,
    scope: ['general'],
  })
  assert.equal(stacked.kind, 'stacked')
  assert.equal(stacked.valuePerStack, 5)
  assert.equal(stacked.conditions, undefined)

  const convert = one({
    id: 'c',
    stat: 'atk',
    kind: 'convert',
    value: 0,
    convert: { from: 'mastery', panelSource: 'final', ratioPercent: 80 },
  })
  assert.equal(convert.kind, 'convert')
  assert.equal(convert.convert.from, 'mastery')
  assert.equal(convert.conditions, undefined)
})