import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        // NAS 防火墙只放行局域网访问 15001（nginx 反代），3010/3001 由反代在
        // Docker 网段内转发，因此 dev 也统一走 15001，与线上保持一致
        proxy: {
            '/api/zzz': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
                // 注意：不再本地 rewrite，由 NAS nginx 完成 /api/zzz -> /api 转换
            },
            '/api/ocr': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            // 图片静态资源：本地优先 public/，缺失的由 NAS 反代从后端补（与 ZZZ-HP dev 代理一致）
            '/boss_image': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/buff_image': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/attribute_image': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/calculator_image': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/guestbook_image': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/character/': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/wengine/': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/drive_disc/': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
            '/bangboo/': {
                target: 'http://192.168.1.133:15001',
                changeOrigin: true,
            },
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ["color-functions", "global-builtin", "import"],
            },
        },
    },
})
