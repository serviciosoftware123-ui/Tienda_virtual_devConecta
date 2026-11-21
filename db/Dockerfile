# Base de datos PostgreSQL con el esquema de DevConecta
FROM postgres:16-alpine
# Los .sql de esta carpeta se ejecutan solo la primera vez que se crea el volumen
COPY init.sql /docker-entrypoint-initdb.d/01-esquema.sql
EXPOSE 5432
