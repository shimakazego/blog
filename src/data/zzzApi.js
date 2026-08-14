async function requestZzz(path) {
    const response = await fetch(`/api/zzz${path}`)
    const json = await response.json().catch(() => null)

    if(!response.ok || json?.code !== 200) {
        throw new Error(json?.message || `ZZZ API request failed: ${response.status}`)
    }

    return json.data
}

export function getCrisisPhases() {
    return requestZzz("/crisis-assault/phases")
}

export function getCrisisBosses(params = {}) {
    const query = new URLSearchParams(params).toString()
    return requestZzz(`/crisis-assault/bosses${query ? `?${query}` : ""}`)
}

export function getCrisisBossChart(bossName, roomType = "normal") {
    const query = new URLSearchParams({
        boss_name: bossName,
        roomType
    }).toString()
    return requestZzz(`/crisis-assault/boss-chart?${query}`)
}

export function getDefenseSeasons(variant = "new") {
    return requestZzz(`/defense/seasons?variant=${variant}`)
}

export function getBossInfoList() {
    return requestZzz("/boss-info/list")
}

export function getCalculatorBuffs() {
    return requestZzz("/calculator-buffs")
}

export function getZzzOverview() {
    return Promise.all([
        getCalculatorBuffs(),
        getDefenseSeasons("new"),
        getDefenseSeasons("old"),
        getCrisisPhases()
    ]).then(([calculatorData, newDefenseData, oldDefenseData, crisisData]) => ({
        agents: Array.isArray(calculatorData?.agents) ? calculatorData.agents : [],
        wengines: Array.isArray(calculatorData?.wengines) ? calculatorData.wengines : [],
        newDefenseSeasons: Array.isArray(newDefenseData) ? newDefenseData : [],
        oldDefenseSeasons: Array.isArray(oldDefenseData) ? oldDefenseData : [],
        crisisSeasons: Array.isArray(crisisData) ? crisisData : []
    }))
}
