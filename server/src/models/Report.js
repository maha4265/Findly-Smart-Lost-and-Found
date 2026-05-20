import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    occurredAt: { type: Date, required: true },
    details: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    embedding: { type: [Number], default: [] },
    aiDescription: { type: String, default: "" },
    verificationQuestion: { type: String, default: "" },
    verificationOptions: { type: [String], default: [] },
    verificationAnswerHash: { type: String, default: "" },
    status: { type: String, enum: ["open", "claimed", "archived"], default: "open" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model("Report", reportSchema);
