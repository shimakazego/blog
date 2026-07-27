const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])

function resolveApiOrigin() {
    const configuredOrigin = import.meta.env.VITE_API_ORIGIN
    if(configuredOrigin) {
        return configuredOrigin.replace(/\/$/, "")
    }

    if(typeof window === "undefined") {
        return "http://192.168.1.133:3001"
    }

    const {protocol, hostname} = window.location
    const resolvedHost = LOCAL_HOSTS.has(hostname) ? "192.168.1.133" : hostname

    return `${protocol}//${resolvedHost}:3001`
}

const API_BASE_URL = `${resolveApiOrigin()}/api`

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
