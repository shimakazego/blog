FROM docker.xuanyuan.run/library/node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --registry=https://registry.npmmirror.com

COPY src ./src
COPY scripts ./scripts
COPY data ./data
COPY *.sql ./
COPY boss_image ./boss_image
COPY shiyu_boss ./shiyu_boss
COPY buff_image ./buff_image
COPY attribute_image ./attribute_image
COPY calculator_image ./calculator_image
COPY character ./character
COPY wengine ./wengine
COPY drive_disc ./drive_disc
COPY bangboo ./bangboo

EXPOSE 3010
CMD ["npm", "start"]
