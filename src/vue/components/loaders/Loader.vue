<template>
    <!-- Loader Wrapper -->
    <div v-if="visible && currentStep"
         id="foxy-loader"
         class="foxy-loader"
         :class="{
            'foxy-loader-tween-in': currentStep === Steps.WILL_ENTER,
            'foxy-loader-tween-out': currentStep === Steps.LEAVING
         }">
        <!-- Loader Content -->
        <div class="foxy-loader-content">
            <ImageView src="/images/logo/agency-logo-small.png"
                       alt="Logo"
                       class="image-view-logo"
                       :class="{
                          'image-view-logo-animated': currentStep >= Steps.ANIMATING_LOGO
                       }"
                       @completed="_onLogoLoaded"
                       :spinner-enabled="false"/>

            <div class="foxy-loader-progress-display"
                 :class="{
                    'foxy-loader-progress-display-hidden': currentStep <  Steps.ANIMATING_PROGRESS,
                    'transition-none': currentStep < Steps.ANIMATING_PROGRESS
                 }">
                <p class="percentage text-2"
                   v-html="`${percentage}%`"/>

                <ProgressBar class="foxy-loader-progress-bar"
                             :percentage="percentage"/>
            </div>
        </div>
    </div>
</template>

<script setup>
import {onMounted, watch, ref} from "vue"
import {useUtils} from "/src/composables/utils.js"
import {useLayout} from "/src/composables/layout.js"
import {useScheduler} from "/src/composables/scheduler.js"
import ImageView from "/src/vue/components/generic/ImageView.vue"
import ProgressBar from "/src/vue/components/widgets/ProgressBar.vue"

const utils = useUtils()
const layout = useLayout()
const scheduler = useScheduler()

const props = defineProps({
    visible: Boolean,
    refreshCount: Number,
    smoothTransitionEnabled: Boolean
})

const Steps = {
    NONE: 0,
    WILL_ENTER: 1,
    ENTERING: 2,
    LOADING_LOGO: 3,
    ANIMATING_LOGO: 4,
    ANIMATING_PROGRESS: 5,
    WAITING_FOR_COMPLETION: 6,
    LEAVING: 7
}

const emit = defineEmits(['rendered', 'ready', 'leaving', 'completed'])

const schedulerTag = "loader"
const didLoadLogo = ref(false)
const didEmitReady = ref(false)
const currentStep = ref(Steps.NONE)
const percentage = ref(0)
const loadingTime = ref(0)

onMounted(() => {
    scheduler.clearAllWithTag(schedulerTag)
    _performTransition()
})

watch(() => props.visible, () => {
    scheduler.clearAllWithTag(schedulerTag)
    _performTransition()
})

watch(() => props.refreshCount, () => {
    scheduler.clearAllWithTag(schedulerTag)
    percentage.value = 0
    currentStep.value = Steps.NONE
    _executeAnimatingLogoStep()
})

const _onLogoLoaded = () => {
    didLoadLogo.value = true
}

const _performTransition = () => {
    if(!props.visible)
        return

    percentage.value = 0
    currentStep.value = Steps.NONE

    if(props.smoothTransitionEnabled)
        _executeEnteringStep()
    else
        _executeAnimatingLogoStep()
}

const _executeEnteringStep = () => {
    currentStep.value = Steps.WILL_ENTER

    scheduler.schedule(() => {
        currentStep.value = Steps.ENTERING
    }, 30, schedulerTag)

    scheduler.schedule(() => {
        _executeAnimatingLogoStep()
    }, 350, schedulerTag)
}

const _executeAnimatingLogoStep = () => {
    currentStep.value = Steps.LOADING_LOGO

    const executeNextStep = () => {
        currentStep.value = Steps.ANIMATING_LOGO
        emit('rendered')

        scheduler.schedule(() => {
            _executeAnimatingProgressStep()
        }, 400, schedulerTag)
    }

    if(didLoadLogo.value)
        executeNextStep()
    else {
        const onWait = () => {
            if(didLoadLogo.value)
                executeNextStep()
            else
                scheduler.schedule(onWait, 100, schedulerTag)
        }

        scheduler.schedule(onWait, 100, schedulerTag)
    }
}

const _executeAnimatingProgressStep = () => {
    currentStep.value = Steps.ANIMATING_PROGRESS

    const transitionDuration = 350
    const updateCount = 40
    const increment = 100 / updateCount
    const timePerUpdate = transitionDuration / updateCount

    const updateProgress = () => {
        percentage.value += increment

        if(percentage.value >= 100) {
            percentage.value = 100
            _executeWaitingForCompletionStep()
            return
        }

        scheduler.schedule(updateProgress, timePerUpdate, schedulerTag)
    }

    scheduler.schedule(updateProgress, timePerUpdate, schedulerTag)
}

const _executeWaitingForCompletionStep = () => {
    currentStep.value = Steps.WAITING_FOR_COMPLETION

    if(!didEmitReady.value) {
        didEmitReady.value = true
        emit('ready')
    }

    const waitingDuration = Math.max(0, layout.firstMeaningfulPaint.value - Date.now())
    loadingTime.value = waitingDuration

    scheduler.schedule(() => {
        _executeLeavingStep()
    }, waitingDuration, schedulerTag)
}

const _executeLeavingStep = () => {
    currentStep.value = Steps.LEAVING
    emit('leaving')

    scheduler.schedule(() => {
        emit('completed')
        currentStep.value = Steps.NONE
        didLoadLogo.value = false
        didEmitReady.value = false
    }, 350, schedulerTag)
}
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

#foxy-loader {
    position: fixed;
    z-index: 9999;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba($dark, 0.98);
}

.foxy-loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
}

.image-view-logo {
    width: 6rem;
    height: 6rem;
}

.image-view-logo-animated {
    animation: pulse 1.1s ease-in-out infinite;
}

.foxy-loader-progress-display {
    min-width: 220px;
    text-align: center;
    transition: opacity 0.25s ease;
}

.foxy-loader-progress-display-hidden {
    opacity: 0;
}

.percentage {
    margin-bottom: 0.65rem;
    color: $white;
}

.foxy-loader-progress-bar {
    width: 100%;
}

.foxy-loader-tween-in {
    animation: fadeIn 0.35s ease both;
}

.foxy-loader-tween-out {
    animation: fadeOut 0.35s ease both;
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}
</style>
