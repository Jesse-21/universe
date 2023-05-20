# Universe, a BEB Dimension Host Implementation

<img src="./.misc/header.png" width="300" />

Universe is an implementation of a BEB (Blockchain-Enabled Broadcast) Dimension Host. Universes are open-source dimension hosts for [BEB, a protocol keeping the internet human](https://docs.beb.xyz). Universes are accessed by clients such as [B7B](https://github.com/bebverse/b7b).

This is an early work that is subject to heavy changes, see our [Github Issues](https://github.com/bebverse/dimension/issues) if you wish to contribute.

**See our developer documents at [`BEB Dimension GraphQL APIs`](https://docs.beb.xyz/developers).**

## Self-hosting Your Universe

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/_1eUPs)

We've provided a starter `Dockerfile` for you, with `MONGO_URL` and `JWT_SECRET` as `ARG` parameters.

We have a [self-hosting guide on our docs](https://docs.beb.xyz/selfhosting) which walks through Railway deployment all the way to using our resolver contract.

1. You'll need a MongoDB server, either by deploying MongoDB yourself or using a hosted solution such as [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or [Railway with our tutorial](https://docs.beb.xyz/selfhosting).
2. You'll also need to deploy this Dockerfile to a hosting location of your preference ([Railway](https://railway.app), [Heroku](https://www.heroku.com/), etc).
3. Once you have a hosted url, you can set this path in the BEBverse [resolver smart contracts](https://github.com/bebverse/contracts). For example, `foo.beb` would resolve to your host at `example-load-balancer-1234567890.us-west-2.elb.amazonaws.com`. See our [self-hosting guide](https://docs.beb.xyz/selfhosting#configuring-the-resolver-contract) for more details!

## Contribution Guidelines

The **bebverse/universe** repo follows the [conventional commits guidelines](https://www.conventionalcommits.org/en/v1.0.0/#summary), please be sure to respect them when committing.

When opening a Pull Request and you are not already a core contributor to [@bebverse](https://github.com/bebverse), be sure to explain your pull request in greater detail so there's less churn when reviewing and we can get your changes landed ASAP, thank you!

## Developing in the bebverse/universe repo

Welcome to the setup guide for Universe! To start, you'll need [node.js](https://github.com/nvm-sh/nvm), [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable), and [mongodb](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/) configured locally.

Once you have node.js, yarn and mongodb, you'll need to fill the following environment variables to have a fully operational BEBverse instance on localhost:

### .env file setup

```
NODE_ENV=production
MONGO_URL=mongodb+srv://... # your local mongo url
JWT_SECRET=change-this
```

### Optional environment variables

```
BLOCK_INITIALIZE=true # Block the initialization of communities on your universe
GLOBAL_MODERATOR_ID=abc123... # An account id that can moderate all dimensions
IMGUR_CLIENT_ID=123... # Enable imgur image uploads on all dimensions https://apidocs.imgur.com
```

Once your environment is configured, run `yarn dev --self-hosted` to have a running instance, and play around with graphql commands at `localhost:8080/graphql`!

## Useful Links

- [BEBverse](https://beb.xyz)
- [B7B](https://b7b.xyz)
- [Register a BEB Dimension](https://beb.domains)
- [Protocol Documentation](https://docs.beb.xyz)
