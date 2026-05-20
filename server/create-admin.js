import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "./src/utils/db.js";
import User from "./src/models/User.js";

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "Admin User";

  if (!email || !password) {
    console.log("Usage: node create-admin.js <email> <password> [name]");
    console.log("Example: node create-admin.js admin@university.edu mypassword123 'System Admin'");
    process.exit(1);
  }

  try {
    await connectDb();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Name: ${adminUser.name}`);
    console.log(`Role: ${adminUser.role}`);

  } catch (error) {
    console.error("Error creating admin user:", error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createAdmin();