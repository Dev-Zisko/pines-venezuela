FROM node:20-alpine

WORKDIR /app

# 1. Copiar los archivos de dependencias usando la ruta de la carpeta backend
COPY backend/package*.json ./backend/

# 2. Entrar e instalar las dependencias de producción
RUN cd backend && npm install --only=production

# 3. Copiar todo el árbol de directorios del proyecto (backend y frontend)
COPY . .

# 4. Exponer el puerto 8080 que configuraste en las variables de Railway
EXPOSE 8080

# 5. Ejecutar indicando la ruta del script
CMD ["node", "backend/server.js"]