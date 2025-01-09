FROM node:20 AS build

WORKDIR /tmp/buildApp

COPY ./package*.json ./

RUN npm install
COPY . .
RUN npm run build

# Production stage with GDAL setup
FROM node:20.3.1-alpine3.17 AS production

# Install GDAL and dependencies for Alpine
RUN apk add --no-cache gdal

ENV NODE_ENV=production
ENV SERVER_PORT=8080

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci --only=production

COPY --chown=node:node --from=build /tmp/buildApp/dist .
COPY --chown=node:node ./config ./config

USER node
EXPOSE 8080
CMD ["dumb-init", "node", "--max_old_space_size=512", "--require", "./common/tracing.js", "./index.js"]
