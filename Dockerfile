FROM node:20-alpine as base
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

CMD [ "node", "index.js" ]