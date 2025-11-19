import bcrypt from "bcrypt";
import 'dotenv/config';
import { db } from "../db.js";
import { users } from "@shared/schema";

async function run() {
  const hash = await bcrypt.hash("admin123", 10);
  const [u] = await db.insert(users).values({
    email: "admin@luxette.com",
    name: "Admin",
    role: "admin",
    active: true,
    passwordHash: hash,
  }).returning();
  console.log("Created", u?.email);
  process.exit(0);
}
run();