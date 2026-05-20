import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required. Copy server/.env.example to server/.env.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
