import mongoose, { ConnectOptions } from "mongoose";

export const connectDB = () => {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState == mongoose.ConnectionStates.connected) {
      return resolve(null);
    }
    mongoose.set("strictQuery", true);
    mongoose
      .connect(process.env.MONGO_URL || "", {
        useNewUrlParser: true,
      } as ConnectOptions)
      .then(() => {
        console.log("✅ Mongoose is up!");
        resolve(null);
      })
      .catch((e) => {
        console.log("❌ Something went wrong with mongo: ", e);
        reject(e);
      });
  });
};
