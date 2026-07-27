# Blog Server

`Express + MySQL + 本地文件存储` 的第一版后端。

## 功能

- `GET /api/health` 健康检查
- `GET /api/posts` / `GET /api/posts/:id` / `POST /api/posts`
- `GET /api/game-guides` / `POST /api/game-guides`
- `GET /api/yuri-entries` / `POST /api/yuri-entries`
- `POST /api/uploads`
- `GET /media/<filename>` 静态访问上传文件

## 快速开始

1. 复制 `.env.example` 为 `.env`
2. 执行 `server/sql/init.sql`
3. 在 `server/` 目录运行：

```bash
npm install
npm run dev
```

## 目录

- `src/config`：环境变量与数据库连接
- `src/routes`：路由入口
- `src/controllers`：接口逻辑
- `src/services`：文件目录等基础服务
- `sql/init.sql`：数据库初始化
- `storage/uploads`：本地上传文件
