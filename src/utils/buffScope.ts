/**
 * 增益作用域（`effect.scope`）—— **数组口径**（用户 2026-10-16 全局改造）。
 *
 * 数据模型：`scope: BuffScope[]`，成员 = `BUFF_SCOPE_OPTIONS`。
 * 读时兼容单值字符串 / 缺省 / 空数组；写时统一数组。
 *
 * 归一化规则（前后端同一套，后端见 `calculatorBuffService.normalizeEffectList`）：
 *  1. 非法值剔除；去重；保持 `BUFF_SCOPE_OPTIONS` 的顺序（界面展示稳定）；
 *  2. 缺省 / 空数组 / 全非法 → `['general']`；
 *  3. **含 `general` → 只留 `['general']`**（通用已覆盖全部）；
 *  4. `skill` 与其它作用域**可以并存**（招式锚点仍需 `skillTargets`）。
 *
 * 结算语义：**数组内任一命中即生效**（`effectMatchesContext` 逐成员判定后取「任一」）——
 * 与「拆成多条单值行」完全等价。
 */
import { BUFF_SCOPE_OPTIONS, type BuffScope } from '@/types/calculator'

/** 合法作用域（按界面顺序） */
export const BUFF_SCOPE_IDS: BuffScope[] = BUFF_SCOPE_OPTIONS.map((item) => item.id)

const BUFF_SCOPE_SET = new Set<string>(BUFF_SCOPE_IDS)

/** 缺省作用域 = 通用 */
export const DEFAULT_BUFF_SCOPES: BuffScope[] = ['general']

/** 把任意形态的 scope 归一化成数组（读时兼容单值 / 缺省 / 空 / 非法） */
export function normalizeBuffScopes(value: unknown): BuffScope[] {
  const raw = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]
  const picked = new Set<BuffScope>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const text = item.trim()
    if (!BUFF_SCOPE_SET.has(text)) continue
    picked.add(text as BuffScope)
    // 含「通用」→ 其余一律丢弃（通用已覆盖全部）
    if (text === 'general') return [...DEFAULT_BUFF_SCOPES]
  }
  if (!picked.size) return [...DEFAULT_BUFF_SCOPES]
  // 按界面顺序输出，展示稳定
  return BUFF_SCOPE_IDS.filter((id) => picked.has(id))
}

/** 是否包含某个作用域（读时兼容单值） */
export function hasBuffScope(value: unknown, scope: BuffScope): boolean {
  return normalizeBuffScopes(value).includes(scope)
}

/** 是否「只有通用」（= 不限子类） */
export function isGeneralScope(value: unknown): boolean {
  const scopes = normalizeBuffScopes(value)
  return scopes.length === 1 && scopes[0] === 'general'
}

/** 数组口径的展示文案：`通用` / `异常 + 异放` */
export function buffScopeLabel(value: unknown): string {
  const scopes = normalizeBuffScopes(value)
  return scopes
    .map((id) => BUFF_SCOPE_OPTIONS.find((item) => item.id === id)?.label ?? id)
    .join(' + ')
}

/** 勾选「通用」时清掉其它；勾具体项时自动取消「通用」（编辑器多选交互用） */
export function toggleBuffScope(current: unknown, scope: BuffScope, checked: boolean): BuffScope[] {
  if (scope === 'general') {
    // 「通用」是排他选项：勾上 = 通用；取消也回到通用（一个都不选没有意义）
    return [...DEFAULT_BUFF_SCOPES]
  }
  const next = new Set<BuffScope>(normalizeBuffScopes(current).filter((id) => id !== 'general'))
  if (checked) next.add(scope)
  else next.delete(scope)
  // 一个具体项都不剩 → 回到通用
  if (!next.size) return [...DEFAULT_BUFF_SCOPES]
  return BUFF_SCOPE_IDS.filter((id) => next.has(id))
}

/** 比较两个 scope 值是否等价（忽略形态差异，供判重 / 变更检测用） */
export function sameBuffScopes(left: unknown, right: unknown): boolean {
  const a = normalizeBuffScopes(left)
  const b = normalizeBuffScopes(right)
  return a.length === b.length && a.every((id, index) => id === b[index])
}
