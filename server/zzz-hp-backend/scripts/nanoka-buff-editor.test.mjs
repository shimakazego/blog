import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLocalDoc,
  nanokaRulesTable,
  planBuffApply,
  sanitizeEffect,
  smartMergeParse,
} from '../src/services/nanokaBuffService.js'

const effect = (patch = {}) => ({ id: 'effect', stat: 'dmgBonus', kind: 'fixed', value: 20, applyTarget: 'self', ...patch })
const block = (id, name) => ({ id, name, note: `${name}备注`, enabledDefault: true })
const row = (key, patch = {}) => ({ key, source: 'passive.core', slot: 'core', slotLabel: '核心', containerIndex: 0, rawText: '原文', effect: effect({ id: key }), ...patch })
const plan = (rows, local = {}) => planBuffApply({ kind: 'agent', local, rows })

test('安比同型漏判：无职业限制的空人数档与回读 null 等价，反复录入不再增长', () => {
  for (const tierRepresentation of [undefined, null, [], [null, null, null], ['', '', '']]) {
    const local = { mindscapeBuffs: [null, null, { effectBlocks: [{ ...block('anby-2', '2影'), effects: [effect({ id: 'stored', stat: 'skillDmgBonus', value: 30, teamProfessionValues: null })] }] }] }
    const incoming = row('incoming', { source: 'talent', containerIndex: 2, block: block('anby-2', '2影'), effect: effect({ id: 'new-id', stat: 'skillDmgBonus', value: 30, teamProfessionValues: tierRepresentation }) })
    const result = plan([incoming], local)
    assert.equal(result.updated, 0, JSON.stringify(tierRepresentation))
    assert.equal(result.skipped, 1)
    assert.equal(result.groups[0].blocks[0].effects.length, 1)
  }
})

test('同批重复与写库回读后的再录入均幂等；只替换 id、备注、分组也不再追加', () => {
  const rows = [
    row('a', { block: block('core', '核心'), effect: effect({ id: 'first', teamProfessionValues: [null, null, null] }) }),
    row('b', { block: block('core', '核心'), effect: effect({ id: 'second', groupId: 'display-only', note: '人工注释', origin: '同来源说明' }) }),
  ]
  const first = plan(rows)
  assert.equal(first.updated, 1)
  assert.equal(first.skipped, 1)
  const doc = buildLocalDoc({ kind: 'agent', local: {}, groups: first.groups })
  const repeated = plan(rows, doc)
  assert.equal(repeated.updated, 0)
  assert.equal(repeated.skipped, 2)
})

test('旧招式字段与新列表、元素/招式顺序及重复成员不影响判重', () => {
  const cases = [
    [{ skillCategory: 'basic', skillSubcategoryId: '落雷' }, { skillTargets: [{ category: 'basic', subcategoryId: '落雷' }] }],
    [{ elementFilter: ['火', '冰'] }, { elementFilter: ['冰', '火', '冰'] }],
    [{ skillTargets: [{ category: 'basic', subcategoryId: 'a' }, { category: 'special', subcategoryId: 'b' }] }, { skillTargets: [{ category: 'special', subcategoryId: 'b' }, { category: 'basic', subcategoryId: 'a' }, { category: 'basic', subcategoryId: 'a' }] }],
    [{ scope: ['anomaly'] }, { conditions: { damageTypes: ['anomaly'] } }],
  ]
  for (const [first, second] of cases) {
    const result = plan([row('a', { effect: effect(first) }), row('b', { effect: effect(second) })])
    assert.equal(result.updated, 1, JSON.stringify([first, second]))
    assert.equal(result.skipped, 1)
  }
})

test('生效目标、条件、数值和启用状态不同不能误判重复', () => {
  const differences = [
    ['目标', { applyTarget: 'team' }],
    ['失衡', { applySituation: 'stagger' }],
    ['受益职业', { applyProfession: '强攻' }],
    ['队内职业', { teamProfession: '异常', teamProfessionValues: [0, null, null] }],
    ['元素', { elementFilter: ['火'] }],
    ['招式', { skillTargets: [{ category: 'basic', subcategoryId: '落雷' }] }],
    ['伤害类型', { conditions: { damageTypes: ['normal'] } }],
    ['数值', { value: 30 }],
    ['默认启用', { enabledDefault: false }],
  ]
  for (const [name, difference] of differences) {
    const result = plan([row('a'), row('b', { effect: effect(difference) })])
    assert.equal(result.updated, 2, name)
    assert.equal(result.skipped, 0, name)
  }
  const professionEffects = [effect({ teamProfession: '异常', teamProfessionValues: [0, null, null] }), effect({ teamProfession: '异常', teamProfessionValues: [null, 0, null] })]
  assert.equal(plan(professionEffects.map((item, index) => row(String(index), { effect: item }))).updated, 2)
})

test('不同来源块或不同影画/精炼槽允许相同数值合法叠加', () => {
  const separateBlocks = plan([row('core', { block: block('core', '核心') }), row('extra', { block: block('extra', '额外') })])
  assert.equal(separateBlocks.updated, 2)
  assert.equal(separateBlocks.groups[0].blocks.length, 2)
  const differentRanks = plan([row('rank1', { containerIndex: 1 }), row('rank2', { containerIndex: 2 })])
  assert.equal(differentRanks.updated, 2)
  assert.equal(differentRanks.groups.length, 2)
  const refinements = planBuffApply({ kind: 'wengine', local: {}, rows: [row('ref1', { source: 'refinement', containerIndex: 0 }), row('ref2', { source: 'refinement', containerIndex: 1 })] })
  assert.equal(refinements.updated, 2)
})

test('新版效果块按 id 入库，保留旧块，名称备注与分组条件完整往返', () => {
  const local = { mindscapeBuffs: [{ effectBlocks: [{ id: 'existing', name: '已有', note: '', effects: [effect({ id: 'old' })] }] }] }
  const rows = [row('a', { block: block('core', '核心被动'), effect: effect({ id: 'a', groupId: 'group', conditions: { damageTypes: ['normal', 'pierce'] } }) }), row('b', { block: block('extra', '额外能力') })]
  const first = plan(rows, local)
  assert.equal(first.updated, 2)
  const doc = buildLocalDoc({ kind: 'agent', local, groups: first.groups })
  const blocks = doc.mindscapeBuffs[0].effectBlocks
  assert.deepEqual(blocks.map((item) => item.name), ['已有', '核心被动', '额外能力'])
  assert.equal(blocks[1].note, '核心被动备注')
  assert.equal(blocks[1].effects[0].groupId, 'group')
  assert.deepEqual(blocks[1].effects[0].conditions, { damageTypes: ['normal', 'pierce'] })
  assert.equal(plan(rows, doc).updated, 0)
  assert.equal(plan(rows, doc).skipped, 2)
  assert.equal(local.mindscapeBuffs[0].effectBlocks.length, 1)
})

test('转模基础值、初始值、上限不同不能误判为重复', () => {
  const base = effect({ kind: 'convert', value: 0, convert: { from: 'mastery', panelSource: 'external', ratioPercent: 10, cap: 100, defaultBase: 0, initialBase: 0 } })
  const patches = [{}, { cap: 200 }, { defaultBase: 100 }, { initialBase: 50 }]
  const rows = patches.map((patch, index) => row(`c${index}`, { effect: { ...base, id: `c${index}`, convert: { ...base.convert, ...patch } } }))
  assert.equal(plan(rows).updated, 4)
  assert.equal(plan([row('a'), row('b', { effect: effect({ enabledDefault: false }) })]).updated, 2)
})

test('同一招式多条关键字累积到一个描述计划，避免最后一条覆盖前面的追加', () => {
  const slots = { stat: '增伤', elements: ['无'], action: '提升', value: 20, unit: '%', target: '自身', conditions: ['无'], scope: '无', stacks: '无', duration: '无', object: '无' }
  const skills = [{ id: 'skill', agentId: 'agent', name: '普通攻击', note: '已有说明' }]
  const rows = [20, 30].map((value) => row(String(value), { rawText: '同一段原文', keywordSlots: { ...slots, value }, skillDesc: { agentId: 'agent', skillName: '普通攻击', category: 'basic' } }))
  const result = planBuffApply({ kind: 'agent', local: {}, rows, skills })
  assert.equal(result.skills.length, 1)
  assert.match(result.skills[0].note, /20/)
  assert.match(result.skills[0].note, /30/)
  assert.match(result.skills[0].note, /已有说明/)
  assert.equal(result.skills[0].note.split('同一段原文').length - 1, 1)
})

test('智能解析使用新版条件字段，人工条件不会被静默覆盖', () => {
  const slots = { stat: '增伤', elements: ['无'], action: '提升', value: 20, unit: '%', target: '自身', conditions: ['无'], scope: '无', stacks: '无', duration: '无', object: '无' }
  const current = effect({ conditions: { damageTypes: ['pierce'] } })
  const result = smartMergeParse({ rows: [{ key: 'a', effect: current, dirty: { conditions: true } }], keywords: [{ key: 'a', slots }] })
  assert.deepEqual(result.rows[0].effect.conditions, current.conditions)
  assert.ok(result.rows[0].conflicts.some((conflict) => conflict.field === 'conditions'))
  assert.equal(sanitizeEffect({ ...current, scope: 'general' }).conditions.damageTypes[0], 'pierce')
  assert.ok(nanokaRulesTable().groups.length > 0)
})