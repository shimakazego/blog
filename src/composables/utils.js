/**
 * Created by Ryan Balieiro on 08.26.2023
 * This composable will implement helper functions that can be used by multiple components within the architecture.
 */
export function useUtils() {
    /**
     * @type {{xl: number, md: number, sm: number, xs: number, lg: number, xxl: number}}
     */
    const BOOTSTRAP_BREAKPOINTS = {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400,
    }

    /**
     * @param {Number} value
     * @param {Number} min
     * @param {Number} max
     * @return {number}
     */
    const clamp = (value, min, max) => {
        if(isNaN(Number(value)) || value === null || value === undefined)
            return min

        return Math.min(Math.max(value, min), max)
    }

    /**
     * @return {boolean}
     */
    const isIOS = () => {
        const userAgent = window.navigator.userAgent.toLowerCase()
        return /iphone|ipad|ipod/.test(userAgent)
    }

    /**
     * @param {String} string
     * @return {boolean}
     */
    const isStringAnImageUrl = (string) => {
        return /\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(string)
    }

    /**
     * @return {boolean}
     */
    const isTouchDevice = () => {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0))
    }

    /**
     * @param {String} string
     * @return {boolean}
     */
    const isValidEmail = (string) => {
        return Boolean(String(string)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            ))
    }

    /**
     * @param {String} title
     * @param {Boolean} [contrastTitle=false]
     * @return {String}
     */
    const parseCustomText = (title, contrastTitle) => {
        if(!title)
            return ``

        const titleClass = contrastTitle ?
            "text-primary-light" :
            "text-primary"

        const withEmphasis = title.replace(/\*(.*?)\*/g, `<span class="${titleClass}">$1</span>`)

        return withEmphasis
            .replace(/（([^（）]+)）/g, `<span class="foxy-hover-note" title="$1">（$1）</span>`)
            .replace(/\(([^()]+)\)/g, `<span class="foxy-hover-note" title="$1">($1)</span>`)
    }

    /**
     * Returns the absolute location of the current page.
     * @return {String}
     */
    const getAbsoluteLocation = () => {
        const { protocol, host, pathname, search, hash } = window.location
        return `${protocol}//${host}${pathname}${search}${hash}`
    }

    /**
     * @return {string}
     */
    const getRootLocation = () => {
        const { protocol, host } = window.location
        const basePath = import.meta.env.BASE_URL
        const path = `${protocol}//${host}${basePath}`
        return path.endsWith('/') ? path : `${path}/`
    }

    return {
        BOOTSTRAP_BREAKPOINTS,
        clamp,
        isIOS,
        isStringAnImageUrl,
        isTouchDevice,
        isValidEmail,
        parseCustomText,
        getAbsoluteLocation,
        getRootLocation
    }
}
