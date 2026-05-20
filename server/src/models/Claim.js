import mongoose from "mongoose";

const claimSchema = new mongoose.Schema(
  {
    lostReport: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true },
    foundReport: { type: mongoose.Schema.Types.ObjectId, ref: "Report", required: true },
    lostUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    foundUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    verificationAnswer: { type: String, required: true },
    answerCorrect: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  },
  { timestamps: true },
);

export default mongoose.model("Claim", claimSchema);
