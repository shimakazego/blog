# 菅名のBlog

一个基于 **Vue 3 + Vite + Bootstrap 5** 的个人博客，部署在家庭 NAS 上。博客包含首页、绝区零工具箱、百合动漫、开心一下、关于博主等区块，并支持全局亮 / 暗主题切换。

绝区零工具箱来自开源项目 [ZZZ-HP](https://github.com/Nie7bai/ZZZ-HP)（群友共创维护，主站 [zzz-hp.top](https://zzz-hp.top/)）。本仓库在此基础上加入了**独立可部署的 ZZZ 后端**、期数时间线、测试服数据和本地图片同步。

## 当前 ZZZ 集成

- 前端路由：`/zzz/...`（危局强袭战、式舆防卫战、临界推演、角色计算器）
- API 前缀：`/api/zzz/...`
- 后端目录：`server/zzz-hp-backend/`（Express + MySQL）
- 图片目录：`server/zzz-hp-backend/boss_image/`，由 nginx 的 `/boss_image/` 反代读取
- 部署编排：`server/docker-compose.zzz.yml`
- 反向代理示例：`nginx/blog-zzz.conf`

### 期数与数据规则

- 期数选择器按结束时间倒序展示；日期相同时按版本、期数稳定排序。
- 默认选中**当前进行中的正式服期数**；如果没有正式服活动期，则回退到最新的公开期。
- 状态标签：
  - `进行中（正式服）`
  - `进行中（测试服）`
  - `即将开始（测试服）`
  - `已结束`
  - `日期待更新`（接口缺日期时，不再误判为进行中）
- 同步脚本只写 `date`、`boss`、`buff`（以及 `boss_info` 的图片/基础资料），不会覆盖角色、音擎、驱动盘、邦布和计算器等数据。
- `date/boss/buff` 新增 `source`、`season_id`，用于区分正式服和测试服数据。
- 测试服数据不会因为日期晚于正式服而被隐藏；3.4 测试期会显示在期数列表顶部。

### 图片同步

同步脚本：

```text
server/zzz-hp-backend/scripts/sync-nanoka-endgame.mjs
```

行为：

- 从 nanoka 汇总 / 详情接口同步式舆防卫战和危局强袭战。
- 对 `boss` 与 `boss_info` 中的图片路径做本地化：
  - 优先复用 `boss_image/` 中已有文件；
  - 缺失时从 `static.nanoka.cc` 下载；
  - 图片写入后端 volume，不需要重新部署前端。
- 同步前后都会执行图片修复，避免新插入的期漏图。
- 会忽略零字节损坏文件并重新下载。

NAS 上的每日任务：

```text
10 9 * * * /volume1/docker/zzz-hp-backend/sync-nanoka-endgame.sh
```

日志位于 `/volume1/docker/zzz-hp-backend/sync-nanoka-endgame.log`。

### 已知限制

测试服 3.4 的以下两张 Boss 立绘在 nanoka 公开 CDN 和公开页面上均不存在，当前前端会显示“暂无立绘”占位图：

- `Monster_Transgressor`
- `Monster_Larval_EX`

其余危局 Boss 图片已本地化。后续如果上游补图，每日同步会自动下载并替换占位显示。

## 功能特性

- 首页区块导航：Hero、绝区零工具箱、百合动漫、开心一下、关于博主。
- 绝区零工具箱：危局强袭战、式舆防卫战、临界推演、角色计算器。
- 期数时间线与测试服数据标记。
- 图片本地化与 nginx 反代，新增图片无需重新构建前端。
- 全局亮 / 暗主题：所有博客页面和 ZZZ 工具页联动，偏好持久化。
- NAS 部署：Gitea Actions 构建、部署，以及本地 `scripts/deploy-nas.ps1` 手动部署。

## 技术栈

- [Vue 3](https://vuejs.org/)（Composition API）+ [Vue Router](https://router.vuejs.org/) + [Pinia](https://pinia.vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Bootstrap 5](https://getbootstrap.com/) + SCSS
- [ECharts](https://echarts.apache.org/)、[Tesseract.js](https://tesseract.projectnaptha.com/)、Markdown-it
- 后端：Express + MySQL（NAS Docker）
- 反向代理：nginx

## 快速开始

### 前端

```bash
npm install
npm run dev       # 开发模式，默认 http://localhost:5173
npm run build     # 生产构建，输出到 dist/
```

开发时前端通过 `/api/zzz/...` 访问 ZZZ 后端，通过 `/api/...` 访问博客后端。需要将 Vite 代理或 `VITE_API_ORIGIN` 指向对应的本地 / NAS 服务。

### ZZZ 后端

```bash
cd server/zzz-hp-backend
cp .env.example .env
# 编辑 .env：数据库、管理密码、OCR 等配置只放在本地
npm install
npm test
npm run dev
```

后端默认监听 `3010`。生产环境使用 Docker：

```bash
cd server
cp zzz-hp-backend/.env.example zzz-hp-backend/.env
# 编辑 zzz-hp-backend/.env；确保外部网络 server_default 已存在
docker compose -f docker-compose.zzz.yml up -d --build
curl http://127.0.0.1:3010/health
```

不要将 `.env`、数据库密码、管理员密码或腾讯云 OCR 密钥提交到 Git。

## 目录结构

```text
.
├── src/                         # 博客与 ZZZ 前端
│   ├── api/                     # API 封装（/api/zzz）
│   ├── components/              # 往期、对比、计算器等面板
│   ├── views/                   # 危局 / 防卫 / 推演 / 计算器页面
│   ├── utils/seasonTimeline.ts  # 期数时间线、状态、默认期选择
│   └── vue/                     # 博客页面区块
├── public/                      # 前端静态资源、Boss 图片回退
├── server/
│   ├── zzz-hp-backend/          # 独立 ZZZ 后端源码、脚本、图片
│   └── docker-compose.zzz.yml
├── nginx/blog-zzz.conf          # 静态站 + API + 图片反代示例
├── .gitea/workflows/
│   ├── deploy-web.yml           # 前端构建与 nginx-test 部署
│   └── deploy-zzz.yml           # ZZZ 后端同步、构建、切换容器
└── scripts/                     # NAS 部署与辅助脚本
```

## 部署

生产环境部署在 NAS（Synology，Docker）：

- `nginx-test`：静态站点 + `/api/zzz` + `/boss_image` 反代（容器内 80，NAS 侧按现有端口映射）
- `zzz-hp-backend`：ZZZ 后端，监听 `3010`
- 博客后端（Express）：`3001`，负责文章、百合动漫等接口
- MySQL：`zzz` 库由 ZZZ 后端使用

### 自动部署

- **前端**：推送 `src/**`、`public/**`、`index.html` 等路径触发 `deploy-web.yml`。
- **后端**：推送 `server/zzz-hp-backend/**`、`server/docker-compose.zzz.yml` 或 `nginx/blog-zzz.conf` 触发 `deploy-zzz.yml`。
- 后端工作流会 rsync 代码、保留 NAS 上已有的 `.env`、构建镜像、替换容器并检查 `/health`。

`deploy-zzz.yml` 使用仓库 Secret `GITEA_TOKEN` 从本机 Gitea 拉取代码；不要把它写进仓库。

### 手动部署

```powershell
powershell -File scripts/deploy-nas.ps1
powershell -File scripts/deploy-nas.ps1 -SkipBuild
```

脚本会构建、上传、备份旧静态站、安装新版本并验证。SSH 认证优先使用密钥，或者使用环境变量 `SSH_PASSWORD`。

## 验证清单

```bash
npm run build

cd server/zzz-hp-backend
node --check scripts/sync-nanoka-endgame.mjs
npm test
```

部署后重点检查：

- `/health` 返回 `{"db":"up"}`
- `/zzz/crisis-assault/history` 默认显示当前正式期
- 期数选择器按时间倒序，3.4 测试期标记为 `进行中（测试服）`
- `/boss_image/` 路径返回 `image/*`，而不是 SPA 的 `index.html`
- 每日同步日志包含 `images` 统计，且没有新增失败项

## 致谢

- **ZZZ-HP**：[GitHub](https://github.com/Nie7bai/ZZZ-HP) / [zzz-hp.top](https://zzz-hp.top/) —— 危局、防卫、计算器、临界推演等模块来源
- **Foxy**：[vue-agency-landing-page-template](https://github.com/ryanbalieiro/vue-agency-landing-page-template) —— 博客基础页面框架
- [Bootstrap](https://getbootstrap.com/) 与 [Vue](https://vuejs.org/) 开源社区
