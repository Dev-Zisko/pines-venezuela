FROM node:20-alpine

# En tu backend/Dockerfile, asegúrate de estar parado en /app
WORKDIR /app

# Copia el package del backend e instala
COPY backend/package*.json ./
RUN npm install --only=production

# COPIA TODO EL PROYECTO (incluyendo la carpeta frontend que está arriba)
COPY . .

EXPOSE 8080
CMD ["node", "backend/server.js"]