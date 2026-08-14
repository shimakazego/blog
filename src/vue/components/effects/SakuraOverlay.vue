<template>
    <canvas ref="canvasRef"
            class="sakura-overlay"
            aria-hidden="true"/>
</template>

<script setup>
import {onBeforeUnmount, onMounted, ref} from "vue"

const props = defineProps({
    count: {
        type: Number,
        default: 18
    },
    enabled: {
        type: Boolean,
        default: true
    }
})

const canvasRef = ref(null)

let context = null
let animationFrameId = null
let resizeObserver = null
let petals = []
let viewport = {width: 0, height: 0}

const randomBetween = (min, max) => min + Math.random() * (max - min)

const createPetal = (spawnAbove = false) => {
    const width = viewport.width || window.innerWidth || 1920
    const height = viewport.height || window.innerHeight || 1080

    return {
        x: randomBetween(-40, width + 40),
        y: spawnAbove ? randomBetween(-height * 0.2, height * 0.1) : randomBetween(-20, height + 20),
        size: randomBetween(10, 22),
        speedY: randomBetween(0.28, 0.72),
        speedX: randomBetween(-0.22, 0.08),
        sway: randomBetween(0.004, 0.012),
        swayOffset: randomBetween(0, Math.PI * 2),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-0.006, 0.006),
        alpha: randomBetween(0.22, 0.48)
    }
}

const seedPetals = () => {
    petals = Array.from({length: props.count}, () => createPetal())
}

const updateViewport = () => {
    if (!canvasRef.value) {
        return
    }

    const parent = canvasRef.value.parentElement
    const rect = parent?.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect?.width || window.innerWidth || 1))
    const height = Math.max(1, Math.floor(rect?.height || window.innerHeight || 1))

    viewport = {width, height}
    canvasRef.value.width = width
    canvasRef.value.height = height
}

const drawPetal = petal => {
    context.save()
    context.translate(petal.x, petal.y)
    context.rotate(petal.rotation)
    context.scale(1, 0.72)

    context.beginPath()
    context.moveTo(0, -petal.size * 0.9)
    context.bezierCurveTo(
        petal.size * 0.75, -petal.size * 0.55,
        petal.size * 0.8, petal.size * 0.15,
        0, petal.size
    )
    context.bezierCurveTo(
        -petal.size * 0.8, petal.size * 0.15,
        -petal.size * 0.75, -petal.size * 0.55,
        0, -petal.size * 0.9
    )
    context.closePath()

    const gradient = context.createLinearGradient(0, -petal.size, 0, petal.size)
    gradient.addColorStop(0, `rgba(255, 244, 249, ${petal.alpha})`)
    gradient.addColorStop(0.52, `rgba(255, 214, 228, ${Math.min(petal.alpha + 0.08, 0.68)})`)
    gradient.addColorStop(1, `rgba(255, 182, 206, ${Math.max(petal.alpha - 0.05, 0.18)})`)

    context.fillStyle = gradient
    context.shadowColor = "rgba(255, 205, 220, 0.16)"
    context.shadowBlur = petal.size * 0.6
    context.fill()

    context.restore()
}

const tick = () => {
    if (!context || !canvasRef.value) {
        return
    }

    context.clearRect(0, 0, viewport.width, viewport.height)

    petals.forEach((petal, index) => {
        petal.y += petal.speedY
        petal.x += petal.speedX + Math.sin(petal.y * petal.sway + petal.swayOffset) * 0.28
        petal.rotation += petal.rotationSpeed

        if (petal.y - petal.size > viewport.height + 18 || petal.x + petal.size < -48 || petal.x - petal.size > viewport.width + 48) {
            petals[index] = createPetal(true)
            petals[index].x = randomBetween(-30, viewport.width + 30)
            petals[index].y = randomBetween(-60, -10)
            return
        }

        drawPetal(petal)
    })

    animationFrameId = window.requestAnimationFrame(tick)
}

const start = () => {
    if (!props.enabled || !canvasRef.value) {
        return
    }

    context = canvasRef.value.getContext("2d")
    updateViewport()
    seedPetals()
    tick()
}

const stop = () => {
    if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
        animationFrameId = null
    }
}

onMounted(() => {
    if (!canvasRef.value) {
        return
    }

    const parent = canvasRef.value.parentElement

    updateViewport()

    if (typeof ResizeObserver !== "undefined" && parent) {
        resizeObserver = new ResizeObserver(() => {
            updateViewport()
        })
        resizeObserver.observe(parent)
    } else {
        window.addEventListener("resize", updateViewport)
    }

    start()
})

onBeforeUnmount(() => {
    stop()

    if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
    } else {
        window.removeEventListener("resize", updateViewport)
    }
})
</script>

<style lang="scss" scoped>
canvas.sakura-overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    opacity: 0.9;
}
</style>
