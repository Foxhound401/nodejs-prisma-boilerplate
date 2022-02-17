## no build module in project 
FROM node:16-alpine as builder
WORKDIR /app
COPY ./package.json ./
RUN yarn
COPY . .

EXPOSE 3000

CMD ["node", "index"]

