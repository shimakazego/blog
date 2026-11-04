/**
 * nanoka 角色静态数据客户端（招式倍率等）。
 * 数据源：https://zzz.nanoka.cc/character → static.nanoka.cc/zzz/{build}/...
 */
import { fetchJson, fetchText } from './nanokaClient.js'

const NANOKA_CHARACTER_PAGE = 'https://zzz.nanoka.cc/character'
const STATIC_BASE = 'https://static.nanoka.cc/zzz'

/**
 * 从 nanoka 角色页静态数据解析当前数据 build tag（如 `3.2.12+18747718`）。
 *
 * 2026-10-02 页面改版为 SvelteKit SPA：HTML 不再嵌 character.json 直链，
 * 数据版本改由 `static.nanoka.cc/manifest.json` 的 `zzz.latest` 提供。
 * 解析顺序：manifest 优先，页面直链兜底。
 */
export async function resolveNanokaCharacterBuildTag(pageUrl = NANOKA_CHARACTER_PAGE) {
  // manifest 在 static 域名根下（不在 /zzz/ 路径内）
  try {
    const manifest = await fetchJson('https://static.nanoka.cc/manifest.json')
    const latest = manifest?.zzz?.latest
    if (latest) return latest
  } catch {
    /* manifest 不可用 → 走旧解析 */
  }
  const html = await fetchText(pageUrl)
  const match = html.match(
    /data-url="https:\/\/static\.nanoka\.cc\/zzz\/([^"]+)\/character\.json"/,
  )
  if (!match) {
    throw new Error('无法从 nanoka manifest 或角色页解析数据版本号')
  }
  return match[1]
}

export async function fetchCharacterIndex(buildTag) {
  return fetchJson(`${STATIC_BASE}/${buildTag}/character.json`)
}

/**
 * @param {string} buildTag
 * @param {string|number} nanokaId 如 1611
 * @param {'zh'|'en'} [locale='zh']
 */
export async function fetchCharacterDetail(buildTag, nanokaId, locale = 'zh') {
  const normalizedLocale = locale === 'en' ? 'en' : 'zh'
  const id = String(nanokaId).trim()
  return fetchJson(`${STATIC_BASE}/${buildTag}/${normalizedLocale}/character/${id}.json`)
}

/**
 * 在 character.json 索引中按 code / 中英名查找 nanoka 数字 id。
 * @returns {{ id: string, code: string, zh?: string, en?: string } | null}
 */
export function findCharacterIndexEntry(index, { code, zh, en } = {}) {
  const wantCode = code?.trim().toLowerCase()
  const wantZh = zh?.trim()
  const wantEn = en?.trim().toLowerCase()
  for (const [id, meta] of Object.entries(index ?? {})) {
    const entryCode = String(meta?.code ?? '').toLowerCase()
    const entryZh = String(meta?.zh ?? '')
    const entryEn = String(meta?.en ?? '').toLowerCase()
    if (wantCode && entryCode === wantCode) {
      return { id, code: meta.code, zh: meta.zh, en: meta.en }
    }
    if (wantZh && entryZh === wantZh) {
      return { id, code: meta.code, zh: meta.zh, en: meta.en }
    }
    if (wantEn && entryEn === wantEn) {
      return { id, code: meta.code, zh: meta.zh, en: meta.en }
    }
  }
  return null
}
