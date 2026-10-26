const wallpaperModules = import.meta.glob("../assets/wallpapers/*.webp", {
    eager: true,
    query: "?url",
    import: "default",
})

const wallpapers = Object.values(wallpaperModules).sort()

export function pickHeroWallpaper() {
    if (!wallpapers.length) {
        return "/images/logo/background.jpg"
    }

    return wallpapers[Math.floor(Math.random() * wallpapers.length)]
}

// Picked once per full page load. SPA navigation keeps the same cover.
export const heroWallpaper = pickHeroWallpaper()
