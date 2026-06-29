FROM node:20-alpine

WORKDIR /app

# 1. Copiar packages e instalar dependencias primero (aprovecha la caché de Docker)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --only=production

# 2. Copiar todo el resto del proyecto (backend y frontend)
COPY . .

# 3. Exponer el puerto configurado en Railway
EXPOSE 8080

# 4. Ejecutar el servidor apuntando correctamente a la ruta
CMD ["node", "backend/server.js"]