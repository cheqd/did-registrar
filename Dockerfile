###############################################################
###         STAGE 1: Build did-registrar app           ###
###############################################################

FROM node:16-alpine AS builder

# Set working directory & bash defaults
WORKDIR /home/node/app

# Copy source files
COPY . .

# Installing dependencies
RUN npm ci

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

# Build-time arguments
ARG NODE_ENV=production
ARG NPM_CONFIG_LOGLEVEL=warn
ARG PORT=3000
ARG MNEMONIC
ARG ADDRESS

# Run-time environment variables
ENV NODE_ENV ${NODE_ENV}
ENV NPM_CONFIG_LOGLEVEL ${NPM_CONFIG_LOGLEVEL}
ENV PORT ${PORT}
ENV MNEMONIC ${MNEMONIC}
ENV ADDRESS ${ADDRESS}

# Install pre-requisites
RUN chown -R node:node /home/node/app && \
    apk update && \
    apk add --no-cache bash ca-certificates

# Specify default port
EXPOSE ${PORT}

# Set user and shell
USER node
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# Run the application
CMD [ "npm start" ]
