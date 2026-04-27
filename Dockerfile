FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm install --no-save prisma
COPY --from=build /app/src/generated/prisma ./src/generated/prisma
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
