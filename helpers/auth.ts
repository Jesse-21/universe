import jwt from "jsonwebtoken";

export const generateNewAccessTokenFromAddress = (address: {
  _id?: string;
  address: string;
}) => {
  if (!address || !address._id) throw new Error("Invalid Address");
  if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        payload: {
          id: address._id,
          address: address.address,
        },
      },
      String(process.env.JWT_SECRET),
      {
        algorithm: "ES512",
      },
      (err, token) => {
        if (err) {
          return reject(err);
        }
        if (!token) {
          return new Error("Empty token");
        }
        return resolve(token);
      }
    );
  });
};
