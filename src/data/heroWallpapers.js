const wallpaperModules = import.meta.glob("../assets/wallpapers/*.webp", {
    eager: true,
    query: "?url",
    import: "default",
})

// Keep all seven in rotation, but favor the high-resolution sources so the
// full-screen cover stays sharp. Low-resolution sources are still possible.
const WALLPAPER_WEIGHTS = {
    1: 4,
    2: 4,
    3: 2,
    4: 1,
    5: 4,
    6: 2,
    7: 4,
}

const wallpaperPool = []

for (const [path, url] of Object.entries(wallpaperModules)) {
    const match = path.match(/wallpaper-(\d+)\.webp$/)
    const weight = match ? (WALLPAPER_WEIGHTS[Number(match[1])] ?? 1) : 1

    for (let i = 0; i < weight; i += 1) {
        wallpaperPool.push(url)
    }
}

export function pickHeroWallpaper() {
    if (!wallpaperPool.length) {
        return "/images/logo/background.jpg"
    }

    return wallpaperPool[Math.floor(Math.random() * wallpaperPool.length)]
}

// Picked once per full page load. SPA navigation keeps the same cover.
export const heroWallpaper = pickHeroWallpaper()
