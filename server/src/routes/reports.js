import bcrypt from "bcryptjs";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { ReportRepository } from "../services/reportRepository.js";
import { analyzeImage } from "../services/aiService.js";
import { findMatches } from "../services/matchingService.js";
import Claim from "../models/Claim.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync("uploads", { recursive: true });
      cb(null, "uploads");
    },
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-z0-9.]/gi, "-").toLowerCase();
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

router.get("/", auth, async (req, res) => {
  res.json(await ReportRepository.list());
});

router.post("/", auth, upload.single("image"), async (req, res) => {
  // Found reports require image and verification Q&A, Lost reports don't
  if (req.body.type === "found" && !req.file) {
    return res.status(400).json({ message: "Image is required for found items." });
  }
  if (req.body.type === "found" && !req.body.verificationQuestion) {
    return res.status(400).json({ message: "Verification question is required for found items." });
  }
  if (req.body.type === "found" && !req.body.verificationAnswer) {
    return res.status(400).json({ message: "Verification answer is required for found items." });
  }

  let embedding = [];
  let aiDescription = "";
  let imageUrl = "";

  // Only process image for found reports
  if (req.file && req.body.type === "found") {
    const analysis = await analyzeImage(req.file.path, req.body.category);
    imageUrl = `/uploads/${path.basename(req.file.path)}`;
    embedding = analysis.embedding;
    aiDescription = analysis.description;
  }

  const report = await ReportRepository.create({
    type: req.body.type,
    category: req.body.category,
    location: req.body.location,
    occurredAt: req.body.occurredAt,
    details: req.body.details || "",
    imageUrl,
    embedding,
    aiDescription,
    verificationQuestion: req.body.type === "found" ? req.body.verificationQuestion : "",
    verificationOptions: req.body.type === "found" ? buildVerificationOptions(req.body.verificationAnswer, req.body.category, req.body.verificationQuestion) : [],
    verificationAnswerHash: req.body.type === "found" ? await bcrypt.hash(normalize(req.body.verificationAnswer), 10) : "",
    user: req.user.id,
  });

  const allReports = await ReportRepository.list();
  const openReports = allReports.filter((item) => item.status === "open");
  const strongMatches = findMatches(openReports, report).filter((match) => match.score >= 62);
  const notifications = strongMatches.map((match) => `Possible ${match.score}% match at ${opposite(report, match).location}.`);

  const io = req.app.get("io");
  io?.emit("match_found", {
    reportId: report._id,
    notifications,
    strongMatches: strongMatches.length,
  });

  res.status(201).json({ report, notifications });
});

router.get("/matches", auth, async (req, res) => {
  const reports = await ReportRepository.list();
  const openReports = reports.filter((report) => report.status === "open");
  const userMatches = findMatches(openReports).filter((match) => String(match.lostItem.user._id) === String(req.user.id));
  res.json(userMatches);
});

router.post("/:id/claims", auth, async (req, res) => {
  // req.body: { lostReportId, foundReportId, verificationAnswer }
  // For backward compatibility, if only one report ID is in params, it's the found report
  const foundReportId = req.body.foundReportId || req.params.id;
  const lostReportId = req.body.lostReportId;

  if (!lostReportId) {
    return res.status(400).json({ message: "Lost report ID is required." });
  }

  const foundReport = await ReportRepository.findById(foundReportId);
  const lostReport = await ReportRepository.findById(lostReportId);

  if (!foundReport) {
    return res.status(404).json({ message: "Found report not found." });
  }
  if (!lostReport) {
    return res.status(404).json({ message: "Lost report not found." });
  }

  if (foundReport.type !== "found" || lostReport.type !== "lost") {
    return res.status(400).json({ message: "Claims must link one lost report with one found report." });
  }

  // Verify the user owns the lost report or is claiming on behalf
  if (String(lostReport.user._id) !== String(req.user.id)) {
    return res.status(403).json({ message: "You can only claim your own lost report." });
  }

  if (String(foundReport.user._id) === String(req.user.id)) {
    return res.status(403).json({ message: "You cannot claim your own found report." });
  }

  // Check if already claimed
  if (lostReport.status === "claimed" || foundReport.status === "claimed") {
    return res.status(400).json({ message: "One or both reports are already claimed." });
  }

  const wrongAttempts = await Claim.countDocuments({
    lostReport: lostReport._id,
    foundReport: foundReport._id,
    lostUser: req.user.id,
    status: "rejected",
  });

  if (wrongAttempts >= 2) {
    return res.status(429).json({ message: "Maximum verification attempts reached for this found report." });
  }

  // Verify the answer against found report's verification question
  const answerCorrect = await bcrypt.compare(normalize(req.body.verificationAnswer), foundReport.verificationAnswerHash);

  if (!answerCorrect) {
    const claim = await Claim.create({
      lostReport: lostReport._id,
      foundReport: foundReport._id,
      lostUser: req.user.id,
      foundUser: foundReport.user._id,
      verificationAnswer: req.body.verificationAnswer,
      answerCorrect: false,
      status: "rejected",
    });
    return res.status(400).json({
      message: "Verification answer is incorrect. Claim rejected.",
      claim,
    });
  }

  // Answer is correct - create verified claim and mark both reports as claimed
  const claim = await Claim.create({
    lostReport: lostReport._id,
    foundReport: foundReport._id,
    lostUser: req.user.id,
    foundUser: foundReport.user._id,
    verificationAnswer: req.body.verificationAnswer,
    answerCorrect: true,
    status: "verified",
  });

  // Mark both reports as claimed
  await ReportRepository.updateStatus(lostReport._id, "claimed");
  await ReportRepository.updateStatus(foundReport._id, "claimed");

  // Get found user details to share with lost user
  const foundUser = await User.findById(foundReport.user._id || foundReport.user).select("-password");

  const updatedClaim = await Claim.findById(claim._id)
    .populate("lostReport")
    .populate("foundReport")
    .populate("lostUser", "-password")
    .populate("foundUser", "-password");

  const io = req.app.get("io");
  io?.emit("claim_verified", {
    claimId: claim._id,
    lostReportId: lostReport._id,
    foundReportId: foundReport._id,
  });

  res.status(201).json({
    message: "Claim verified successfully! Contact details shared.",
    claim: updatedClaim,
    foundUserContact: {
      name: foundUser.name,
      email: foundUser.email,
      phone: foundUser.phone,
      address: foundUser.address,
    },
  });
});;

function normalize(value = "") {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildVerificationOptions(answer = "", category = "", question = "") {
  const correctAnswer = String(answer).trim();
  const lowerAnswer = normalize(correctAnswer);
  const fallbackOptions = optionBank(category, question, correctAnswer);
  const options = [correctAnswer];

  fallbackOptions.forEach((option) => {
    if (options.length >= 4) return;
    if (normalize(option) !== lowerAnswer && !options.some((existing) => normalize(existing) === normalize(option))) {
      options.push(option);
    }
  });

  let counter = 1;
  while (options.length < 4) {
    options.push(`None of these ${counter}`);
    counter += 1;
  }

  return shuffle(options);
}

function optionBank(category = "", question = "", answer = "") {
  const text = normalize(`${question} ${answer} ${category}`);

  const colors = ["Black", "Blue", "Red", "White", "Green", "Yellow", "Brown", "Silver", "Grey", "Pink"];
  const designs = [
    "Mickey Mouse",
    "Minnie Mouse",
    "Donald Duck",
    "Tom and Jerry",
    "Superman logo",
    "Batman logo",
    "Butterfly design",
    "Flower design",
    "Heart design",
    "Star design",
    "Plain design",
    "Cartoon character",
  ];
  const marks = [
    "Small scratch",
    "Large scratch",
    "Cracked corner",
    "Sticker mark",
    "Name written on it",
    "No visible mark",
    "Tape mark",
    "Ink mark",
  ];
  const counts = ["One", "Two", "Three", "Four", "Five"];
  const materials = ["Leather", "Plastic", "Metal", "Rubber", "Cloth", "Transparent material"];
  const brands = ["Samsung", "Apple", "Redmi", "Realme", "Vivo", "Oppo", "HP", "Dell", "Lenovo", "Acer"];

  if (hasAny(text, ["color", "colour"])) return colors;
  if (hasAny(text, ["design", "keychain", "sticker", "logo", "symbol", "picture", "print", "character"])) return designs;
  if (hasAny(text, ["scratch", "mark", "damage", "dent", "crack"])) return marks;
  if (hasAny(text, ["how many", "number", "count"])) return counts;
  if (hasAny(text, ["material", "made of", "cover type"])) return materials;
  if (hasAny(text, ["brand", "company", "model"])) return brands;

  const byCategory = {
    Phone: ["Butterfly sticker", "Cracked screen guard", "Camera ring scratch", "Transparent case", "Black phone case"],
    Laptop: ["Keyboard sticker", "Laptop sleeve", "Small dent near corner", "Silver body", "Black charger mark"],
    Wallet: ["Brown leather", "Black wallet", "ID card inside", "Coin pocket", "Zipper pocket"],
    Keys: ["Mickey Mouse keychain", "Blue keychain", "Silver keyring", "Bike key", "Two keys"],
    keys: ["Mickey Mouse keychain", "Blue keychain", "Silver keyring", "Bike key", "Two keys"],
    Bag: ["Bottle holder", "Front zip", "College logo", "Black straps", "Side pocket"],
    bag: ["Bottle holder", "Front zip", "College logo", "Black straps", "Side pocket"],
  };

  return [...(byCategory[category] || []), ...designs, ...marks, ...colors];
}

function hasAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function shuffle(values) {
  return values
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

function opposite(report, match) {
  return String(match.lostItem._id) === String(report._id) ? match.foundItem : match.lostItem;
}

export default router;
