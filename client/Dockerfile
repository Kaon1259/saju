FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install express http-proxy-middleware
EXPOSE 3000
CMD ["node", "server.js"]
