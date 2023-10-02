# Universe, a Wield Host Implementation

<img src="./.misc/header.png" width="300" />

Universe is an implementation of a Wield Host. Universes are open-source hosts
for [Wield, a protocol making crypto exploration fun](https://wield.co).

This is an early work that is subject to heavy changes, see our
[Github Issues](https://github.com/wieldprotocol/dimension/issues) if you wish
to contribute.

**See our developer documents at
[`Wield Dimension GraphQL APIs`](https://docs.wield.co/developers).**

## Self-hosting Your Universe

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/_1eUPs)

We've provided a starter `Dockerfile` for you, with `MONGO_URL` and `JWT_SECRET`
as `ARG` parameters.

We have a [self-hosting guide on our docs](https://docs.wield.co/selfhosting)
which walks through Railway deployment all the way to using our resolver
contract.

1. You'll need a MongoDB server, either by deploying MongoDB yourself or using a
   hosted solution such as [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   or [Railway with our tutorial](https://docs.wield.co/selfhosting).
2. You'll also need to deploy this Dockerfile to a hosting location of your
   preference ([Railway](https://railway.app),
   [Heroku](https://www.heroku.com/), etc).
3. Once you have a hosted url, you can set this path in the BEBverse
   [resolver smart contracts](https://github.com/wieldprotocol/contracts). For
   example, `foo.cast` would resolve to your host at
   `example-load-balancer-1234567890.us-west-2.elb.amazonaws.com`. See our
   [self-hosting guide](https://docs.wield.co/selfhosting#configuring-the-resolver-contract)
   for more details!

## Contribution Guidelines

The **wieldprotocol/universe** repo follows the
[conventional commits guidelines](https://www.conventionalcommits.org/en/v1.0.0/#summary),
please be sure to respect them when committing.

When opening a Pull Request and you are not already a core contributor to
[@wieldprotocol](https://github.com/wieldprotocol), be sure to explain your pull
request in greater detail so there's less churn when reviewing and we can get
your changes landed ASAP, thank you!

## Developing in the wieldprotocol/universe repo

Welcome to the setup guide for Universe! To start, you'll need
[node.js](https://github.com/nvm-sh/nvm),
[yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable), and
[mongodb](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/)
configured locally.

Once you have node.js, yarn and mongodb, you'll need to fill the following
environment variables to have a fully operational Wield instance on localhost:

### .env file setup

```
NODE_ENV=production
MONGO_URL=mongodb+srv://... # your local mongo url
JWT_SECRET=change-this
```

Once your environment is configured, run `yarn dev --self-hosted` to have a
running instance, and play around with graphql commands at
`localhost:8080/graphql`!

## Useful Links

- [Register a Wield Dimension](https://wield.co)
- [Protocol Documentation](https://docs.wield.co)
