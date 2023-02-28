# Deploying to Railway 🚂

### 1. Create a [Railway Account](https://railway.app)

This is where you'll be hosting your dimensions!

### 2. [Start a MongoDB Project](https://railway.app/new) in Railway

All dimensions need a database to store posts

<img src="https://i.imgur.com/lXaQtRs.png" width="300" />

### 3. Open your Terminal and run the following commands:

### 4. Run: `git clone git@github.com:bebverse/universe.git`

This clones the dimension code repository, which is entirely open-source!

### 5. Run: `npm i -g @railway/cli`

This installs the railway cli.

### 6. Run: `railway login`

This logs into railway so you can configure services from the command line!

### 7. Run: `cd universe && railway link`

We need to make railway aware of the dimension code!

### 8. Run: `railway up`

This pushes the service to railway.

### 9. Set the `JWT_SECRET` service variable in your project to a generated password (i.e. 1Password)

We need to make sure no one can eavedrop when talking to your dimension!

<img src="https://i.imgur.com/2OSMsGO.png" width="300">

### 10. You are now self-hosting! 🚀

Next up is [configuring your domain to our resolver contract](https://etherscan.io/address/0xf71a58ddc57214e431168c4a3f2ff62a069ab8a6#writeContract), which is in another tutorial 🤓
