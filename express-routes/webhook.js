const app = require("express").Router();
const Sentry = require("@sentry/node");

// Webhook handler route
// Example data:
// const data = {
//   webhookId: "wh_octjglnywaupz6th",
//   id: "whevt_ogrc5v64myey69ux",
//   createdAt: "2022-02-28T17:48:53.306Z",
//   type: "ADDRESS_ACTIVITY",
//   event: {
//     network: "MATIC_MAINNET",
//     activity: [
//       {
//         category: "token",
//         fromAddress: "0x59479de9d374bdbcba6c791e5d036591976fe422",
//         toAddress: "0x59479de9d374bdbcba6c791e5d036591976fe425",
//         erc721TokenId: "0x1",
//         rawContract: {
//           rawValue: "0x",
//           address: "0x93C46aA4DdfD0413d95D0eF3c478982997cE9861",
//         },
//         log: {
//           removed: false,
//           address: "0x93C46aA4DdfD0413d95D0eF3c478982997cE9861",
//           data: "0x",
//           topics: [
//             "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
//             "0x00000000000000000000000059479de9d374bdbcba6c791e5d036591976fe422",
//             "0x00000000000000000000000059479de9d374bdbcba6c791e5d036591976fe425",
//             "0x0000000000000000000000000000000000000000000000000000000000000001",
//           ],
//         },
//       },
//     ],
//   },
// };
app.post("/address-activity", async (req, res) => {
  try {
    // Extract and process the data from the webhook
    const webhookData = req.body;
    console.log("Webhook received:", webhookData);

    // Here, you can add your logic to handle the webhook data.
    // For example, updating a database, triggering other processes, etc.

    // Send a response to acknowledge receipt of the webhook
    res.status(200).send("Webhook received and processed");
  } catch (error) {
    console.error("Error handling webhook:", error);
    Sentry.captureException(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = {
  router: app,
};
