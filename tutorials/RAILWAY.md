# Deploying to Railway 🚂

### 1. Create a [Railway Account](https://railway.app)

### 2. [Start a MongoDB Project](https://railway.app/new) in Railway

<img src="https://i.imgur.com/lXaQtRs.png" width="300" />

### 3. Open your Terminal and run the following commands:

### 4. Run: `git clone git@github.com:bebverse/universe.git`

### 5. Run: `npm i -g @railway/cli`

### 6. Run: `railway login`

### 7. Run: `cd universe && railway link`

### 8. Run: `railway up`

### 9. Set the `JWT_SECRET` service variable in your project to a generated password (i.e. 1Password)

<img src="https://i.imgur.com/2OSMsGO.png" width="300">

### 10. You are now self-hosting! 🚀

Next up is [configuring your domain to our resolver contract](https://etherscan.io/address/0xf71a58ddc57214e431168c4a3f2ff62a069ab8a6#writeContract), which is in another tutorial 🤓
