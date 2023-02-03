# Realm, An Open BEB Dimension Implementation

Realm is an implementation of a BEB (Blockchain-Enabled Broadcast) Dimension. Realms are open-source, self-hosted nodes for [BEB, an open messaging protocol](https://github.com/bebverse/protocol).

This is an early work and will be subject to heavy changes, see our [Github Issues](https://github.com/bebverse/dimension/issues) if you wish to contribute.

**Note: currently the easiest way to build on BEBverse is to use the [`non-protocol BEBverse GraphQL APIs`](https://hackmd.io/@bebverse/graphql).**

<img src="./.misc/header.png" width="300" />

## Contribution Guidelines

The **bebverse/realm** repo follows the [conventional commits guidelines](https://www.conventionalcommits.org/en/v1.0.0/#summary), please be sure to respect them when committing.

When opening a Pull Request and you are not already a core contributor to [@bebverse](https://github.com/bebverse), be sure to explain your pull request in greater detail so there's less churn when reviewing and we can get your changes landed ASAP, thank you!

## Setting up the bebverse/realm repo

Welcome to the setup guide for Realm! To start, you'll need [node.js](https://github.com/nvm-sh/nvm), [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable), and [mongodb](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/) configured locally.

Once you have node.js, yarn and mongodb, you'll need to fill the following environment variables to have a fully operational BEBverse instance on localhost:

### .env file setup

```
MONGO_URL=mongodb+srv://...
```

After your environment is configured, run `yarn dev` to have a running instance, and play around with graphql commands at `localhost:8080/graphql`!

## Useful Links

- [BEBverse](https://beb.xyz)
- [Register a BEBverse Dimension](https://beb.domains)
- [High-Level Protocol Specifications](https://github.com/bebverse/protocol)
