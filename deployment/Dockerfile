FROM node:16-alpine as builder
WORKDIR /app
COPY ./package.json ./
RUN yarn
COPY . .
RUN yarn prisma generate

EXPOSE 3000

CMD ["node", "index"]

