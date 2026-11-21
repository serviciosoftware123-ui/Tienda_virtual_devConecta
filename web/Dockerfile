# Frontend de DevConecta: se compila con Node y se sirve con Nginx (build multi-etapa).

# --- Etapa 1: compilar React con Vite ---
FROM node:20-alpine AS build
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY shared /app/shared
COPY web/ ./
RUN npm run build

# --- Etapa 2: servir los archivos estáticos ---
FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
