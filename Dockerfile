# The table server. Build: docker build -t pung-server . ; run: docker run -p 8787:8787 pung-server
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run server:build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist-server ./dist-server
EXPOSE 8787
CMD ["node", "dist-server/index.mjs"]
