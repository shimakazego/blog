import type {
  AgentBuffDoc,
  BangbooBuffDoc,
  CalculatorBuffData,
  DamageEventMode,
  DriveDiscBuffDoc,
  FollowUpSkillRule,
  SkillSubcategory,
  WengineBuffDoc,
} from '@/types/calculator'
import { withAdminAuthHeaders } from '@/utils/adminAuth'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

const ZZZ_API_PREFIX = '/api/zzz'

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase()
  const needsAdmin = method !== 'GET' && method !== 'HEAD'
  const headers = needsAdmin ? withAdminAuthHeaders(init?.headers) : init?.headers
  const response = await fetch(input, { ...init, headers })
  const json = (await response.json()) as ApiResponse<T>
  if (!response.ok || json.code !== 200) {
    throw new Error(json.message || `请求失败: ${response.status}`)
  }
  return json.data
}

export async function fetchCalculatorBuffs(): Promise<CalculatorBuffData> {
  return requestJson<CalculatorBuffData>(`${ZZZ_API_PREFIX}/calculator-buffs`)
}

export async function saveAgentBuff(doc: AgentBuffDoc): Promise<AgentBuffDoc> {
  return requestJson<AgentBuffDoc>(`${ZZZ_API_PREFIX}/calculator-buffs/agents`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function fetchSkillSubcategories(): Promise<SkillSubcategory[]> {
  return requestJson<SkillSubcategory[]>(`${ZZZ_API_PREFIX}/calculator-buffs/skill-subcategories`)
}

export async function saveSkillSubcategory(
  doc: SkillSubcategory,
): Promise<SkillSubcategory> {
  return requestJson<SkillSubcategory>(`${ZZZ_API_PREFIX}/calculator-buffs/skill-subcategories`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function deleteSkillSubcategory(id: string): Promise<void> {
  await requestJson<{ id: string }>(
    `${ZZZ_API_PREFIX}/calculator-buffs/skill-subcategories/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function saveFollowUpSkillRule(
  doc: FollowUpSkillRule,
): Promise<FollowUpSkillRule> {
  return requestJson<FollowUpSkillRule>(`${ZZZ_API_PREFIX}/calculator-buffs/follow-up-rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function deleteFollowUpSkillRule(id: string): Promise<void> {
  await requestJson<{ id: string }>(
    `${ZZZ_API_PREFIX}/calculator-buffs/follow-up-rules/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function fetchDamageEventModes(): Promise<DamageEventMode[]> {
  return requestJson<DamageEventMode[]>(`${ZZZ_API_PREFIX}/calculator-buffs/damage-event-modes`)
}

export async function saveDamageEventMode(doc: DamageEventMode): Promise<DamageEventMode> {
  return requestJson<DamageEventMode>(`${ZZZ_API_PREFIX}/calculator-buffs/damage-event-modes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function deleteDamageEventMode(id: string): Promise<void> {
  await requestJson<{ id: string }>(
    `${ZZZ_API_PREFIX}/calculator-buffs/damage-event-modes/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export async function deleteAgentBuff(id: string): Promise<void> {
  await requestJson<{ id: string }>(`${ZZZ_API_PREFIX}/calculator-buffs/agents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function saveWengineBuff(doc: WengineBuffDoc): Promise<WengineBuffDoc> {
  return requestJson<WengineBuffDoc>(`${ZZZ_API_PREFIX}/calculator-buffs/wengines`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function deleteWengineBuff(id: string): Promise<void> {
  await requestJson<{ id: string }>(`${ZZZ_API_PREFIX}/calculator-buffs/wengines/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function saveBangbooBuff(doc: BangbooBuffDoc): Promise<BangbooBuffDoc> {
  return requestJson<BangbooBuffDoc>(`${ZZZ_API_PREFIX}/calculator-buffs/bangboos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function deleteBangbooBuff(id: string): Promise<void> {
  await requestJson<{ id: string }>(`${ZZZ_API_PREFIX}/calculator-buffs/bangboos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function saveDriveDiscBuff(doc: DriveDiscBuffDoc): Promise<DriveDiscBuffDoc> {
  return requestJson<DriveDiscBuffDoc>(`${ZZZ_API_PREFIX}/calculator-buffs/drive-discs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  })
}

export async function deleteDriveDiscBuff(id: string): Promise<void> {
  await requestJson<{ id: string }>(`${ZZZ_API_PREFIX}/calculator-buffs/drive-discs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
