### How to run
- run `cp .env.example .env` and fill out you .env
- run `yarn migrate` to sync data table and sequelize definition
- run `yarn start:dev`


### ENV

Config database for development by using `DEV_DATABASE_URL` when `NODE_ENV=development`

### Issues with docker

*bcrypt*
the alpine use `musl libc` instead of standard `libc` so 
it is not compatible with complied binaries.

Need to compile the bcrypt for the environment


Install dependencies


`apk --no-cache add --virtual builds-deps build-base python`

In alpine based image. Force recompiling the bcrypt native addon after npm install with this command:


`npm rebuild bcrypt --build-from-source`
