import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import {fileURLToPath, URL} from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')
    // NAS 反代入口：由本地 .env.development 的 VITE_NAS_ORIGIN 提供（不写入仓库）
    const nasOrigin = (env.VITE_NAS_ORIGIN || '').replace(/\/+$/, '')

    const proxy = {}
    if (nasOrigin) {
        // NAS 防火墙只放行局域网访问反代入口（nginx），3010/3001 由反代在
        // Docker 网段内转发，因此 dev 统一走反代，与线上保持一致（不在此处 rewrite）
        proxy['/api/zzz'] = {target: nasOrigin, changeOrigin: true}
        proxy['/api/ocr'] = {target: nasOrigin, changeOrigin: true}
        // 图片静态资源：本地优先 public/，缺失的由 NAS 反代从后端补
        for (const prefix of [
            '/boss_image',
            '/buff_image',
            '/attribute_image',
            '/calculator_image',
            '/guestbook_image',
            '/character/',
            '/wengine/',
            '/drive_disc/',
            '/bangboo/',
        ]) {
            proxy[prefix] = {target: nasOrigin, changeOrigin: true}
        }
    }

    return {
        base: '/',
        plugins: [vue()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            proxy,
        },
        css: {
            preprocessorOptions: {
                scss: {
                    silenceDeprecations: ["color-functions", "global-builtin", "import"],
                },
            },
        },
    }
})