FROM docker.xuanyuan.run/library/node:20-alpine

WORKDIR /app

COPY package.json ./
# 使用国内镜像源，避免部分网络环境下 registry.npmjs.org 解析失败（EAI_AGAIN）
RUN npm install --omit=dev --registry=https://registry.npmmirror.com

COPY src ./src
COPY scripts ./scripts
COPY sql ./sql
COPY storage ./storage

EXPOSE 3001

CMD ["npm", "start"]
