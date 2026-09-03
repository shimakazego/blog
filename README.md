# 菅名のBlog

一个基于 **Vue 3 + Vite + Bootstrap 5** 的个人博客，部署在家庭 NAS 上。

博客目前包含首页、绝区零工具箱（ZZZ-HP 集成）、百合动漫、开心一下、关于博主等区块，并支持全局亮 / 暗主题切换。

## 功能特性

- **首页区块导航**：Hero、绝区零工具箱、百合动漫、开心一下、关于博主，单页锚点切换
- **绝区零工具箱（ZZZ-HP 集成）**：危局强袭、式舆防卫战、角色计算器、临界推演四个完整工具模块，数据与功能同步自开源项目 [ZZZ-HP](https://github.com/Nie7bai/ZZZ-HP)（群友共创维护，主站 [zzz-hp.top](https://zzz-hp.top/)），工具箱页已注明来源
- **全局亮暗主题**：右下角悬浮按钮一键切换，所有区块（博客页面 + ZZZ 工具页）联动，主题偏好持久化
- **NAS 一键部署**：`scripts/deploy-nas.ps1` 构建 → 上传 → 备份 → 安装 → 验证全自动

## 技术栈

- [Vue 3](https://vuejs.org/)（Composition API）+ [Vue Router](https://router.vuejs.org/) + [Pinia](https://pinia.vuejs.org/)
- [Vite](https://vitejs.dev/) 构建
- [Bootstrap 5](https://getbootstrap.com/) + SCSS
- [ECharts](https://echarts.apache.org/)（图表）、[Tesseract.js](https://tesseract.projectnaptha.com/)（截图 OCR）、Markdown-it 等
- 后端：部署于 NAS 的 Express + MySQL（远程，仅通过反代访问）

## 快速开始

```bash
npm install
npm run dev       # 开发模式，默认 http://localhost:5173
npm run build     # 生产构建，输出到 dist/
```

开发环境的 API 说明：前端统一通过 `/api/zzz/...` 前缀访问 NAS 上的反代（`http://192.168.1.133:15001`，nginx 容器），由反代分别转发到 ZZZ-HP 后端（3010）与博客后端（3001）；`VITE_API_ORIGIN` 指向博客 API 服务地址。

## 目录结构

```
├── src/
│   ├── assets/          # 全局样式与主题变量（zzz-theme.css 等）
│   ├── scss/            # 博客 SCSS（含 _blog-theme.scss 亮暗主题变量）
│   ├── api/             # ZZZ-HP API 封装（统一 /api/zzz 前缀）
│   ├── components/      # ZZZ-HP 面板组件（history/defense/deduction/calculator）
│   ├── layouts/         # ModeLayout（ZZZ 工具页通用布局）
│   ├── views/           # ZZZ-HP 页面视图（危局/防卫/推演/计算器）
│   ├── stores/          # Pinia（主题、计算器 Buff、各对比页状态）
│   ├── vue/             # 博客页面与区块（content/pages、content/sections）
│   └── main.js          # 路由与全局注册
├── public/              # 静态资源（图片、字体、背景素材）
├── scripts/
│   ├── deploy-nas.ps1         # NAS 部署脚本
│   └── deploy-nas-remote.sh   # 远端安装脚本（由部署脚本上传执行）
└── vite.config.js
```

## 亮暗主题

- 切换按钮：`src/vue/components/widgets/ThemeToggle.vue`（全站悬浮，右下角）
- 主题状态：`src/stores/theme.ts`（`<html data-theme>` + localStorage 持久化）
- 博客区块变量：`src/scss/_blog-theme.scss`；ZZZ 工具页变量：`src/assets/zzz-theme.css`
- 明暗两套均对五个首页区块与全部 ZZZ 工具页生效

## 部署

生产环境部署在 NAS（Synology，Docker）：

- `nginx-test` 容器（端口 15001）：静态站点 + `/api/zzz` 反代
- `zzz-hp-backend` 容器（端口 3010）：ZZZ-HP 后端（MySQL 3307）
- 博客后端（Express，端口 3001）：文章/百合动漫等接口

一键部署：

```powershell
powershell -File scripts/deploy-nas.ps1          # 构建 + 部署
powershell -File scripts/deploy-nas.ps1 -SkipBuild   # 仅部署现有 dist
```

脚本会：构建 → 打包上传 → 备份线上旧版 → 安装 → 同步后端图片资源 → 自动验证；认证优先使用 SSH 密钥（`ssh-copy-id ljx@192.168.1.133`），或设置环境变量 `SSH_PASSWORD`。

## 致谢

- **ZZZ-HP**：[GitHub](https://github.com/Nie7bai/ZZZ-HP) / [zzz-hp.top](https://zzz-hp.top/) —— 危局、防卫、计算器、临界推演等模块均来自该共创项目
- **Foxy**：[vue-agency-landing-page-template](https://github.com/ryanbalieiro/vue-agency-landing-page-template) —— 本站基础页面框架源自该 Vue3 模板
- [Bootstrap](https://getbootstrap.com/) & [Vue](https://vuejs.org/) 开源框架