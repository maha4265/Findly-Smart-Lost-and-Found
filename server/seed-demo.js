import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "./src/utils/db.js";
import User from "./src/models/User.js";
import Report from "./src/models/Report.js";

async function seedDemoData() {
  try {
    await connectDb();

    console.log("🌱 Seeding demo data...");

    // Create demo users
    const users = [
      {
        name: "Alice Johnson",
        email: "alice@university.edu",
        password: await bcrypt.hash("password123", 10),
        role: "student",
      },
      {
        name: "Bob Smith",
        email: "bob@university.edu",
        password: await bcrypt.hash("password123", 10),
        role: "student",
      },
      {
        name: "System Admin",
        email: "admin@university.edu",
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
      },
    ];

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }

    // Get user IDs
    const alice = await User.findOne({ email: "alice@university.edu" });
    const bob = await User.findOne({ email: "bob@university.edu" });

    // Create demo reports
    const reports = [
      {
        type: "lost",
        category: "phone",
        location: "Library",
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        details: "Black iPhone with blue case, has a small crack on screen",
        imageUrl: "/uploads/demo-phone.jpg",
        embedding: Array.from({ length: 64 }, () => Math.random()),
        aiDescription: "Likely dark phone with extracted visual fingerprint for similarity matching.",
        verificationQuestion: "What color is the phone case?",
        verificationAnswerHash: await bcrypt.hash("blue", 10),
        user: alice._id,
        status: "open",
      },
      {
        type: "found",
        category: "phone",
        location: "Cafeteria",
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        details: "Found a phone under a table, looks like an iPhone",
        imageUrl: "/uploads/demo-phone.jpg",
        embedding: Array.from({ length: 64 }, () => Math.random()),
        aiDescription: "Likely dark phone with extracted visual fingerprint for similarity matching.",
        verificationQuestion: "What was the phone sitting on?",
        verificationAnswerHash: await bcrypt.hash("table", 10),
        user: bob._id,
        status: "open",
      },
      {
        type: "lost",
        category: "wallet",
        location: "Sports Complex",
        occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        details: "Brown leather wallet with university ID and some cash",
        imageUrl: "/uploads/demo-wallet.jpg",
        embedding: Array.from({ length: 64 }, () => Math.random()),
        aiDescription: "Likely mid-tone wallet with extracted visual fingerprint for similarity matching.",
        verificationQuestion: "What color is the wallet?",
        verificationAnswerHash: await bcrypt.hash("brown", 10),
        user: alice._id,
        status: "open",
      },
    ];

    for (const reportData of reports) {
      await Report.create(reportData);
      console.log(`✅ Created ${reportData.type} report: ${reportData.category} at ${reportData.location}`);
    }

    console.log("\n🎉 Demo data seeded successfully!");
    console.log("\nLogin credentials:");
    console.log("Student: alice@university.edu / password123");
    console.log("Student: bob@university.edu / password123");
    console.log("Admin: admin@university.edu / admin123");

  } catch (error) {
    console.error("Error seeding demo data:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedDemoData();