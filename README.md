# Universal Registrar Driver for did:cheqd

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/cheqd/did-registrar?color=green&label=stable%20release&style=flat-square)](https://github.com/cheqd/did-registrar/releases/latest) ![GitHub Release Date](https://img.shields.io/github/release-date/cheqd/did-registrar?color=green&style=flat-square) [![GitHub license](https://img.shields.io/github/license/cheqd/did-registrar?color=blue&style=flat-square)](https://github.com/cheqd/did-registrar/blob/main/LICENSE)

[![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/cheqd/did-registrar?include_prereleases&label=dev%20release&style=flat-square)](https://github.com/cheqd/did-registrar/releases/) ![GitHub commits since latest release (by date)](https://img.shields.io/github/commits-since/cheqd/did-registrar/latest?style=flat-square) [![GitHub contributors](https://img.shields.io/github/contributors/cheqd/did-registrar?label=contributors%20%E2%9D%A4%EF%B8%8F&style=flat-square)](https://github.com/cheqd/did-registrar/graphs/contributors)

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/cheqd/did-registrar/dispatch.yml?label=workflows&style=flat-square)](https://github.com/cheqd/did-registrar/actions/workflows/dispatch.yml) [![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/cheqd/did-registrar/codeql.yml?label=CodeQL&style=flat-square)](https://github.com/cheqd/did-registrar/actions/workflows/codeql.yml) ![GitHub repo size](https://img.shields.io/github/repo-size/cheqd/did-registrar?style=flat-square)

## ℹ️ Overview

The purpose of this service is to provide a [Universal Registrar driver](https://identity.foundation/did-registration/#abstract) for the `did:cheqd` DID method. Universal Registrar is a project to provide [simple REST APIs for DID creation, update, and deactivation](https://identity.foundation/did-registration/).

## 📖 Endpoints

- POST `/create`
- POST `/update`
- POST `/deactivate`
- POST `/{did}/create-resource`
- POST `/createResource`
- POST `/updateResource`
- GET `/key-pair`
- GET `/did-document`
- GET `/properties`
- GET `/methods`
- GET `/traits`

## 🧑‍💻🛠 Developer Guide

### Setup

#### Environment variable configuration

Environment variables needed for the Registrar are

1. `FEE_PAYER_MAINNET_MNEMONIC` : The cosmos payer mnemonic for the Cheqd Mainnet
2. `FEE_PAYER_TESTNET_MNEMONIC` : The cosmos payer mnemonic for the Cheqd Testnet, By default it's the Testnet Faucet
3. `LOCAL_STORE_TTL` (default: `600`): The time in seconds for the registrar to store data in cache
4. `PORT` (default: `3000`): The port number


Clone the repository

```bash
git clone git@github.com:cheqd/did-registrar.git
cd did-registrar
```

***

### Running a DID Registrar Using Docker

Build Docker container image using Dockerfile:

```bash
docker build --target cheqd-did-registrar . --tag did-registrar:local
```

Run the Docker container (modify according to your own build tags and other desired parameters):

```bash
docker run -it did-registrar:local
```

***

### Running a DID Registrar Locally

```bash
npm install
npm run build
npm start 
```

### 🛠 Testing

This repository contains the playwright tests for unit and integration testing.
Add any additional tests in the `tests` directory.

You must set up these two env vars before running test:

1. `TEST_PRIVATE_KEY` : Private key for signing the requests
2. `TEST_PUBLIC_KEY` : Corresponding public key

Then execute the tests

```bash
npm run test
# if tests faile because of parallelism, run
npm run test -- --workers=1
```

## 🐞 Bug reports & 🤔 feature requests

If you notice anything not behaving how you expected, or would like to make a suggestion / request for a new feature, please create a [**new issue**](https://github.com/cheqd/did-registrar/issues/new/choose) and let us know.

## 💬 Community

Our [**Discord server**](http://cheqd.link/discord-github) is the primary chat channel for our open-source community, software developers, and node operators.

Please reach out to us there for discussions, help, and feedback on the project.

## 🙋 Find us elsewhere

[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge\&logo=telegram\&logoColor=white)](https://t.me/cheqd) [![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge\&logo=discord\&logoColor=white)](http://cheqd.link/discord-github) [![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge\&logo=twitter\&logoColor=white)](https://twitter.com/intent/follow?screen_name=cheqd_io) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge\&logo=linkedin\&logoColor=white)](http://cheqd.link/linkedin) [![Medium](https://img.shields.io/badge/Medium-12100E?style=for-the-badge\&logo=medium\&logoColor=white)](https://blog.cheqd.io) [![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge\&logo=youtube\&logoColor=white)](https://www.youtube.com/channel/UCBUGvvH6t3BAYo5u41hJPzw/)
