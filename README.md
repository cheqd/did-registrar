# Universal Registrar Driver for did:cheqd

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/cheqd/did-registrar?color=green&label=stable%20release&style=flat-square)](https://github.com/cheqd/did-registrar/releases/latest) ![GitHub Release Date](https://img.shields.io/github/release-date/cheqd/did-registrar?color=green&style=flat-square) [![GitHub license](https://img.shields.io/github/license/cheqd/did-registrar?color=blue&style=flat-square)](https://github.com/cheqd/did-registrar/blob/main/LICENSE)

[![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/cheqd/did-registrar?include_prereleases&label=dev%20release&style=flat-square)](https://github.com/cheqd/did-registrar/releases/) ![GitHub commits since latest release (by date)](https://img.shields.io/github/commits-since/cheqd/did-registrar/latest?style=flat-square) [![GitHub contributors](https://img.shields.io/github/contributors/cheqd/did-registrar?label=contributors%20%E2%9D%A4%EF%B8%8F&style=flat-square)](https://github.com/cheqd/did-registrar/graphs/contributors)

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/cheqd/did-registrar/Workflow%20Dispatch?label=workflows&style=flat-square)](https://github.com/cheqd/did-registrar/actions/workflows/dispatch.yml) [![GitHub Workflow Status](https://img.shields.io/github/workflow/status/cheqd/did-registrar/CodeQL?label=CodeQL&style=flat-square)](https://github.com/cheqd/did-registrar/actions/workflows/codeql.yml) ![GitHub repo size](https://img.shields.io/github/repo-size/cheqd/did-registrar?style=flat-square)

## ℹ️ Overview

The purpose of this service is to provide a [Universal Registrar driver](https://identity.foundation/did-registration/#abstract) for the `did:cheqd` DID method. Universal Registrar is a project to provide simple REST APIs for DID creation, update, and deactivation.

## 📖 Endpoints

- `/create`
- `/update`
- `/api-docs`

## 🧑‍💻🛠 Developer Guide

### Setup

To build and run in Docker, use the [Dockerfile](Dockerfile) provided.

```bash
docker build -t cheqd-did-registrar .
```

## 🐞 Bug reports & 🤔 feature requests

If you notice anything not behaving how you expected, or would like to make a suggestion / request for a new feature, please create a [**new issue**](https://github.com/cheqd/did-registrar/issues/new/choose) and let us know.

## 💬 Community

The [**cheqd Community Slack**](http://cheqd.link/join-cheqd-slack) is our primary chat channel for the open-source community, software developers, and node operators.

Please reach out to us there for discussions, help, and feedback on the project.

## 🙋 Find us elsewhere

[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge\&logo=telegram\&logoColor=white)](https://t.me/cheqd) [![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge\&logo=discord\&logoColor=white)](http://cheqd.link/discord-github) [![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge\&logo=twitter\&logoColor=white)](https://twitter.com/intent/follow?screen\_name=cheqd\_io) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge\&logo=linkedin\&logoColor=white)](http://cheqd.link/linkedin) [![Slack](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge\&logo=slack\&logoColor=white)](http://cheqd.link/join-cheqd-slack) [![Medium](https://img.shields.io/badge/Medium-12100E?style=for-the-badge\&logo=medium\&logoColor=white)](https://blog.cheqd.io) [![YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge\&logo=youtube\&logoColor=white)](https://www.youtube.com/channel/UCBUGvvH6t3BAYo5u41hJPzw/)
