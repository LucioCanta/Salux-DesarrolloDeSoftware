FROM node:20-alpine

# Prisma necesita OpenSSL para su motor de consultas/migraciones; las
# imágenes node:*-alpine no lo traen instalado por defecto.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --omit=dev

COPY . .

# No correr como root: si alguien lograra ejecutar código en la app, no
# tendría control del contenedor. La imagen oficial de Node trae el usuario `node`.
USER node

EXPOSE 3000

CMD ["node", "src/app.js"]
