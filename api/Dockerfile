# API de DevConecta (Node.js + Express)
# Se construye desde la raíz del proyecto para poder copiar la carpeta shared/.
FROM node:20-alpine

WORKDIR /app/api

# 1) Dependencias primero: si no cambian, Docker reutiliza esta capa.
COPY api/package*.json ./
RUN npm install --omit=dev

# 2) Código compartido (reglas de negocio y datos de ejemplo) y código de la API.
COPY shared /app/shared
COPY api/src ./src

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

# Corre como usuario sin privilegios.
USER node
CMD ["node", "src/index.js"]
