const Sentry = require("@sentry/node");
const dotenv = require("dotenv");
const express = require("express");
const { resolvers } = require("./graphql/resolvers");

const { loadSchemaSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");

const { connectDB } = require("./connectdb");
const { router: imageRouter } = require("./express-routes/image");
const { router: referralRouter } = require("./express-routes/referral");
const { router: utilsRouter } = require("./express-routes/utils");
const { router: communityRouter } = require("./express-routes/community");
const { router: metadataRouter } = require("./express-routes/metadata");
const { router: farcasterRouter } = require("./express-routes/farcaster");
const {
  router: publicProfileRouter,
} = require("./express-routes/ens-or-address");
const { router: apiKeyRouter } = require("./express-routes/apikey");
const { router: scoreRouter } = require("./express-routes/score");

const { router: ensRouter } = require("./express-routes/ens");

const { requireAuth } = require("./helpers/auth-middleware");

const responseCachePlugin =
  require("@apollo/server-plugin-response-cache").default;

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const {
  ApolloServerPluginDrainHttpServer,
} = require("@apollo/server/plugin/drainHttpServer");
const http = require("http");
const cors = require("cors");
const { json } = require("body-parser");

const { Service: _RegistrarService } = require("./services/RegistrarService");

const port = parseInt(process.env.PORT, 10) || 8080;

const typeDefs = loadSchemaSync(
  ["./graphql/typeDefs/*.gql", "./graphql/typeDefs/**/*.gql"],
  {
    loaders: [new GraphQLFileLoader()],
  }
);

const { createDataLoaders } = require("./graphql/dataloaders");

const app = express();
// https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
app.set("trust proxy", process.env.TRUST_PROXY_OVERRIDE || 2); // increase based on how many proxies are in front of the server

const httpServer = http.createServer(app);

(async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV === "development",
    cache: "bounded",
    csrfPrevention: true,
    formatError: (_formattedError, error) => {
      Sentry.captureException(error);
      console.error(error);
      return new Error("Internal server error");
    },
    plugins: [
      responseCachePlugin(),
      ApolloServerPluginDrainHttpServer({ httpServer }),
    ],
  });

  await server.start();
  app.use(
    "/graphql",
    cors(),
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const context = {
          dataloaders: createDataLoaders(),
          services: {
            RegistrarService: new _RegistrarService(),
            // @TODO add more services here
          },
        };
        try {
          const data = await requireAuth(
            req.headers.authorization?.slice(7) || ""
          );
          return {
            ...context,
            accountId: data.payload.id,
            isExternal: data.payload.isExternal,
          };
        } catch (e) {
          try {
            if (!e.message.includes("jwt must be provided")) {
              Sentry.captureException(e);
              console.error(e);
            }
            return { ...context };
          } catch (e) {
            Sentry.captureException(e);
            console.error(e);
            return { ...context };
          }
        }
      },
    })
  );

  app.get("/", (_req, res) => {
    res.json({
      message:
        "Welcome to a Wield Dimensions Host running github.com/wieldlabs/universe, see /graphql for the API!",
    });
  });

  app.get("/health", async (_req, res) => {
    try {
      await connectDB();
      res.status(200).send("Okay!");
    } catch (e) {
      res.status(500).send("Error!");
    }
  });

  app.use(express.json());
  app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, sentry-trace, Accept, Authorization, baggage, API-KEY, signer"
    );

    next();
  });

  app.use("/image", imageRouter);
  app.use("/profile", publicProfileRouter);
  app.use("/community", communityRouter);
  app.use("/metadata", metadataRouter);
  app.use("/utils", utilsRouter);
  app.use("/ens/", ensRouter);
  app.use("/score", scoreRouter);
  app.use("/referral", referralRouter);
  app.use("/farcaster", farcasterRouter);
  app.use("/apikey", apiKeyRouter);

  require("yargs").command(
    "$0",
    "Start your Universe",
    (yargs) => {
      yargs.option("self-hosted", {
        type: "boolean",
        default: false,
        description: "Run Universe in self-hosted mode",
      });
      yargs.option("env", {
        type: "string",
        default: ".env",
        description: "Path to .env file",
      });
    },
    async (argv) => {
      dotenv.config({ path: argv.env });
      process.env.MODE = argv.selfHosted ? "self-hosted" : "default";

      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || "development",
          tracesSampleRate: 1.0,
        });
      }

      let REQUIRED_ENV_VARS = ["JWT_SECRET", "MONGO_URL", "NODE_ENV"];

      if (process.env.MODE === "self-hosted") {
        console.log(`Universe is running in self-hosted mode! 😎`);
      } else {
        console.log(`Universe is running in default mode! 👀`);
        REQUIRED_ENV_VARS = REQUIRED_ENV_VARS.concat([
          "IMGUR_CLIENT_ID",
          "MAGIC_LINK_SECRET",
          "IMGUR_CLIENT_ID",
          "EXPO_ACCESS_TOKEN",
          "BEB_FARCASTER_APP_TOKEN",
          "SENTRY_DSN",
          "HOMESTEAD_NODE_URL",
        ]);
      }

      const passed = REQUIRED_ENV_VARS.filter((envVar) => {
        if (!process.env[envVar]) {
          console.error(
            `${envVar} is not set. Please set it (e.g. .env file)!`
          );
          return true;
        }
      });

      if (passed.length > 0) {
        console.error("Exiting...");
        process.exit(1);
      }

      if (process.env.JWT_SECRET === "change-this") {
        console.error(
          "Please change your JWT_SECRET from the default! (e.g. .env file)"
        );
        process.exit(1);
      }

      await connectDB();
      await new Promise((resolve) =>
        httpServer.listen({ port: port }, resolve)
      );

      console.log(`🚀 Universe is running at http://localhost:${port}/graphql`);
    }
  ).argv;
})();
