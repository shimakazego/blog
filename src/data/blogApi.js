function resolveApiOrigin() {
    const configuredOrigin = import.meta.env.VITE_API_ORIGIN
    if(configuredOrigin) {
        return configuredOrigin.replace(/\/$/, "")
    }

    if(typeof window === "undefined") {
        return ""
    }

    // 部署后与站点同源（经 NAS 反代），无需硬编码主机
    return window.location.origin
}

const API_BASE_URL = `${resolveApiOrigin().replace(/\/$/, "")}/api`

async function requestJson(path) {
    const response = await fetch(`${API_BASE_URL}${path}`)

    if(!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
    }

    return response.json()
}

function toQueryString(params = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if(value !== undefined && value !== null && value !== "") {
            searchParams.set(key, value)
        }
    })

    const query = searchParams.toString()
    return query ? `?${query}` : ""
}

export function listPosts(params = {}) {
    return requestJson(`/posts${toQueryString(params)}`)
}

export function listGameGuides(params = {}) {
    return requestJson(`/game-guides${toQueryString(params)}`)
}

export function listYuriEntries(params = {}) {
    return requestJson(`/yuri-entries${toQueryString(params)}`)
}

export {resolveApiOrigin}
