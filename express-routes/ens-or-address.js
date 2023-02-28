const app = require("express").Router();
const axios = require("axios").default;
const Sentry = require("@sentry/node");

const {
  getAddressFromEnsOrAddress,
} = require("../helpers/get-address-from-ens");
const {
  resolveEnsDataFromAddress,
  resolveEnsFromAddress,
} = require("../helpers/resolve-ens-data-from-address");

/**
 * Get public profile informationn from ens or address
 * @retuns PublicAccountMutationResponseLean
 */
app.get("/ens-or-address/:ens_or_address", async (req, res) => {
  const ensOrAddress = req.params.ens_or_address;
  if (!ensOrAddress)
    return res.json({
      code: 404,
      success: false,
      message: "Not found",
    });

  try {
    /** step 0: get address associated with ens */
    const address = await getAddressFromEnsOrAddress(ensOrAddress);
    /** step1: optionally get ENS */
    const isEns = ensOrAddress.slice(-3) === "eth";
    let ens = isEns ? ensOrAddress : await resolveEnsFromAddress(address);

    return res.json({
      code: 200,
      success: true,
      address,
      ens,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

/**
 * Get public ENS profile informationn from address
 * @retuns { ens, avatar, twitter, content }
 */
app.get("/ens-or-address/public_ens_info/:ens_or_address", async (req, res) => {
  const ensOrAddress = req.params.ens_or_address;
  if (!ensOrAddress)
    return res.json({
      code: 404,
      success: false,
      message: "Not found",
    });

  try {
    /** step 0: get address associated with ens */
    const data = await resolveEnsDataFromAddress(ensOrAddress);

    return res.json({
      code: 200,
      success: true,
      data,
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

/**
 * Get public profile informationn from ens or address
 * @retuns PublicAccountMutationResponse
 */
app.get("/ens-or-address/public_info/:ens_or_address", async (req, res) => {
  const ensOrAddress = req.params.ens_or_address;
  if (!ensOrAddress)
    return res.json({
      code: 404,
      success: false,
      message: "Not found",
    });

  try {
    /** step 0: get address associated with ens */
    const address = await getAddressFromEnsOrAddress(ensOrAddress);

    /** step 1: get POAPs */
    const poapsPromise = axios.get(
      `https://api.poap.xyz/actions/scan/${address}`,
      {
        headers: {
          accept: "application/json",
        },
      }
    );

    /** step 2: get followed snapshots */
    const spacesPromise = axios.post(`https://hub.snapshot.org/graphql`, {
      headers: {
        "content-type": "application/json",
      },
      query: `
        query SpaceFollow {
            follows(
                first: 10,
                where: {
                follower: "${address}"
                }
            ) {
                space {
                id
                avatar
                name
                }
            }
        }`,
    });

    /** step 3: resolve everything at once */
    const [{ data: poaps }, { data: spaces }] = await Promise.all([
      poapsPromise,
      spacesPromise,
    ]);

    return res.json({
      code: 200,
      success: true,
      address,
      poaps,
      spaces: spaces?.data?.follows || [],
    });
  } catch (e) {
    Sentry.captureException(e);
    console.error(e);
    return res.json({
      code: 500,
      success: false,
      message: e.message,
    });
  }
});

module.exports = {
  router: app,
};
