###############################################################
###         STAGE 1: Build did-registrar app           ###
###############################################################

FROM node:16-alpine AS builder

# Set working directory & bash defaults
WORKDIR /home/node/app

# Copy source files
COPY package-lock.json package.json ./

# Installing dependencies
RUN npm ci

COPY . .

# Build the app
RUN npm run build

###############################################################
###             STAGE 2: Run did-registar app            ###
###############################################################

FROM node:16-alpine AS runner

# Set working directory & bash defaults
WORKDIR /home/node/app

# Copy built application
COPY --from=builder /home/node/app/dist .

ARG PORT=9080
ARG MNEMONIC
ARG ADDRESS

ENV PORT ${PORT}
ENV MNEMONIC ${MNEMONIC}
ENV ADDRESS ${ADDRESS}

RUN npm i swagger-ui-express

EXPOSE ${PORT}

CMD [ "node", "index.js" ]
