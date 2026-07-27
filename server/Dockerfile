FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY sql ./sql
COPY storage ./storage

EXPOSE 3001

CMD ["npm", "start"]
