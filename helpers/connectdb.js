import mongoose from "mongoose";

export const connectDB = () => {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState == mongoose.ConnectionStates.connected) {
      return resolve();
    }
    mongoose.set("strictQuery", true);
    mongoose
      .connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
      })
      .then(() => {
        console.log("✅ Mongoose is up!");
        resolve();
      })
      .catch((e) => {
        console.log("❌ Something went wrong with mongo: ", e);
        reject(e);
      });
  });
};
