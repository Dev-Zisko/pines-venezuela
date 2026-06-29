FROM node:20-alpine

WORKDIR /app

# Copiar paquetes e instalar dependencias limpiamente
COPY package*.json ./
RUN npm install --only=production

# Copiar el código del servidor
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]