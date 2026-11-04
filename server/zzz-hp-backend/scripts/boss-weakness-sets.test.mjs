import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeWeaknessSet,
  parseWeaknessSetsJson,
  serializeWeaknessSets,
} from '../src/utils/bossWeaknessSets.js'

test('多套弱点/抗性：保留抗性与高抗性子集', () => {
  const set = normalizeWeaknessSet(
    { id: 'a', label: ' 第一阶段 ', weakness: '火 电', resistance: '冰', resistanceHigh: '冰' },
    'fallback',
  )
  assert.deepEqual(set, {
    id: 'a',
    label: '第一阶段',
    weakness: '火 电',
    resistance: '冰',
    resistanceHigh: '冰',
  })
})

test('多套弱点/抗性：空套也保留，缺 id 用序号兜底', () => {
  const sets = parseWeaknessSetsJson([
    { weakness: '火' },
    { weakness: '', resistance: '' },
    { resistance: '物理' },
  ])
  assert.equal(sets.length, 3)
  assert.equal(sets[0].id, 'set-1')
  assert.equal(sets[1].id, 'set-2')
  assert.equal(sets[1].weakness, null)
  assert.equal(sets[1].resistance, null)
  assert.equal(sets[2].id, 'set-3')
  assert.equal(sets[2].resistance, '物理')
})

test('多套弱点/抗性：JSON 字符串与数组同口径，重复 id 顺延', () => {
  const raw = JSON.stringify([
    { id: 'dup', weakness: '冰' },
    { id: 'dup', resistance: '火' },
  ])
  const sets = parseWeaknessSetsJson(raw)
  assert.equal(sets.length, 2)
  assert.equal(sets[0].id, 'dup')
  assert.notEqual(sets[1].id, 'dup')
})

test('多套弱点/抗性：空集合序列化为 null，非空可回读', () => {
  assert.equal(serializeWeaknessSets([]), null)
  const serialized = serializeWeaknessSets([{ weakness: '冰', resistanceHigh: '冰' }])
  assert.equal(typeof serialized, 'string')
  assert.deepEqual(parseWeaknessSetsJson(serialized), [
    { id: 'set-1', label: null, weakness: '冰', resistance: null, resistanceHigh: '冰' },
  ])
})

test('多套弱点/抗性：第一套镜像回基础三列，旧单套可还原为 legacy 套', async () => {
  const { mirrorWeaknessLegacyColumns, weaknessSetsFromLegacy } = await import(
    '../src/utils/bossWeaknessSets.js'
  )
  const mirrored = mirrorWeaknessLegacyColumns([
    { weakness: '火 电', resistance: '冰', resistanceHigh: '冰' },
    { weakness: '以太' },
  ])
  assert.deepEqual(mirrored, { weakness: '火 电', resistance: '冰', resistance_high: '冰' })
  assert.deepEqual(weaknessSetsFromLegacy({ weakness: '物理', resistance: '电', resistance_high: '电' }), [
    { id: 'legacy', label: null, weakness: '物理', resistance: '电', resistanceHigh: '电' },
  ])
  assert.deepEqual(weaknessSetsFromLegacy({ weakness: '', resistance: '' }), [])
})
