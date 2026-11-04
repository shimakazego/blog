export interface SeasonTimelineItem {
  dateRange?: string | null
  /** 部分图表/管理端数据没有拼好的 dateRange，直接提供起止日 */
  startDate?: string | null
  endDate?: string | null
  isHidden?: boolean
  source?: 'live' | 'test'
  version?: string
}

export interface SeasonRange {
  start: number
  end: number
}

function parseDateTime(value: string | null | undefined, hour: number, minute: number, second: number) {
  const raw = String(value ?? '')
    .trim()
    .replace(/[./年]/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .slice(0, 10)
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return 0
  const normalized = `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}`
  const date = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 0
  date.setHours(hour, minute, second, 0)
  return date.getTime()
}

function splitDateRange(value: string): [string, string] {
  const raw = value.trim()
  if (!raw || raw === '日期待更新') return ['', '']

  // 只用带空格的 hyphen / 波浪线 / 中文“至”拆范围，避免把 ISO 日期里的 - 拆开。
  const parts = raw
    .split(/\s+(?:-|~|–|—|至|到)\s+|\s*[~–—至到]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  return [parts[0] ?? '', parts[1] ?? '']
}

export function parseSeasonRange(item: SeasonTimelineItem): SeasonRange {
  const [rawStart = '', rawEnd = ''] = splitDateRange(String(item.dateRange ?? ''))
  return {
    start: parseDateTime(rawStart || item.startDate, 4, 0, 0),
    end: parseDateTime(rawEnd || item.endDate, 3, 59, 59),
  }
}

export type SeasonStatusKey = 'upcoming' | 'active' | 'ended' | 'unknown'

export function resolveSeasonStatus(item: SeasonTimelineItem): {
  key: SeasonStatusKey
  label: string
  source: 'live' | 'test'
} {
  const range = parseSeasonRange(item)
  const now = Date.now()
  const inferredTest =
    (range.start && now < range.start) ||
    /^3\.(?:[4-9]|[1-9]\d)/.test(String(item.version ?? ''))
  const source =
    item.source === 'live' ? 'live' : item.source === 'test' ? 'test' : inferredTest ? 'test' : 'live'
  const datePendingLabel = source === 'test' ? '日期待更新（测试服）' : '日期待更新'

  if (!range.start || !range.end) {
    return { key: 'unknown', label: datePendingLabel, source }
  }
  if (now < range.start) {
    return {
      key: 'upcoming',
      label: source === 'test' ? '即将开始（测试服）' : '即将开始',
      source,
    }
  }
  if (now > range.end) {
    return { key: 'ended', label: source === 'test' ? '已结束（测试服）' : '已结束', source }
  }
  return {
    key: 'active',
    label: source === 'test' ? '进行中（测试服）' : '进行中（正式服）',
    source,
  }
}

function versionPhaseValue(item: SeasonTimelineItem) {
  const version = String(item.version ?? '').match(/\d+(?:\.\d+)?/)?.[0]
  const phase = String((item as { phase?: string }).phase ?? '').match(/\d+/)?.[0]
  return {
    version: version ? Number(version) : 0,
    phase: phase ? Number(phase) : 0,
  }
}

/** 无日期数据时仍给出稳定顺序，避免旧接口/缺日期数据看起来像乱序。 */
function compareVersionPhaseDesc(a: SeasonTimelineItem, b: SeasonTimelineItem): number {
  const va = versionPhaseValue(a)
  const vb = versionPhaseValue(b)
  // 同一期的多个阶段日期相同，保持 1/2/3 的自然顺序；版本仍倒序。
  return vb.version - va.version || va.phase - vb.phase
}

export function compareSeasonDesc(a: SeasonTimelineItem, b: SeasonTimelineItem): number {
  const ra = parseSeasonRange(a)
  const rb = parseSeasonRange(b)
  const aHasDate = Boolean(ra.start && ra.end)
  const bHasDate = Boolean(rb.start && rb.end)

  if (aHasDate !== bHasDate) return aHasDate ? -1 : 1
  if (aHasDate) {
    const dateDiff = rb.end - ra.end || rb.start - ra.start
    if (dateDiff) return dateDiff
  }
  return compareVersionPhaseDesc(a, b)
}

/** 默认选当前进行中的正式期；同时进行时取最近开的一期（正式服优先于长周期测试服）。 */
export function defaultActiveSeasonIndex(list: SeasonTimelineItem[]): number {
  if (!list.length) return 0
  const now = Date.now()
  const active = list
    .map((item, index) => ({ item, index, range: parseSeasonRange(item) }))
    .filter(({ item, range }) => !item.isHidden && range.start && range.end && range.start <= now && now <= range.end)
  if (active.length) {
    active.sort((a, b) => {
      if (a.item.source !== b.item.source) {
        if (a.item.source === 'live') return -1
        if (b.item.source === 'live') return 1
      }
      return b.range.start - a.range.start
    })
    return active[0]!.index
  }

  const publicItems = list
    .map((item, index) => ({ item, index, range: parseSeasonRange(item) }))
    .filter(({ item }) => !item.isHidden)
  if (publicItems.length) {
    publicItems.sort((a, b) => compareSeasonDesc(a.item, b.item))
    return publicItems[0]!.index
  }
  return 0
}
