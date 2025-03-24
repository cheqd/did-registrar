###############################################################
###             STAGE 1: Build did-registrar app            ###
###############################################################

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /home/node/app

# Copy source
COPY . .

# Installing dependencies
RUN npm ci

# Build the app
RUN npm run build


###############################################################
###             STAGE 2: Build did-registrar runner         ###
###############################################################

FROM node:20-alpine AS runner

# Set Node.js environment
ENV NODE_ENV=production

# Set working directory
WORKDIR /home/node/app

# Install pre-requisites
RUN apk update && \
    apk add --no-cache bash ca-certificates

# Copy files from builder
COPY --from=builder --chown=node:node /home/node/app/*.json /home/node/app/*.md ./
COPY --from=builder --chown=node:node /home/node/app/dist ./dist

# Install production dependencies
RUN npm ci

# Build-time arguments
ARG NPM_CONFIG_LOGLEVEL=warn
ARG PORT=3000
ARG FEE_PAYER_TESTNET_MNEMONIC
ARG FEE_PAYER_MAINNET_MNEMONIC

# NPM environment variables
ENV NPM_CONFIG_LOGLEVEL=${NPM_CONFIG_LOGLEVEL}
ENV PORT=${PORT}

# App-specific environment variables
ENV FEE_PAYER_TESTNET_MNEMONIC=${FEE_PAYER_TESTNET_MNEMONIC}
ENV FEE_PAYER_MAINNET_MNEMONIC=${FEE_PAYER_MAINNET_MNEMONIC}

# Specify default port
EXPOSE ${PORT}

# Set user and shell
USER node
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# Run the application
CMD [ "node", "dist/index.js" ]
