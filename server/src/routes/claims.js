import express from "express";
import Claim from "../models/Claim.js";
import "../models/Report.js";
import "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const query = req.user.role === "admin"
    ? {}
    : {
        $or: [
          { lostUser: req.user.id },
          { foundUser: req.user.id },
        ],
      };

  const claims = await Claim.find(query)
    .populate("lostReport")
    .populate("foundReport")
    .populate("lostUser", "-password")
    .populate("foundUser", "-password")
    .sort({ createdAt: -1 });

  res.json(claims.filter((claim) => claim.lostReport && claim.foundReport && claim.lostUser && claim.foundUser));
});

export default router;
