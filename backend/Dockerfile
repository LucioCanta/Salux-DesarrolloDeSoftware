FROM node:20-alpine

# Prisma necesita OpenSSL para su motor de consultas/migraciones; las
# imágenes node:*-alpine no lo traen instalado por defecto.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "src/app.js"]
