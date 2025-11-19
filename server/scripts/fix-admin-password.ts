import bcrypt from "bcrypt";
import 'dotenv/config';
import { db } from "../db.js";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function fixAdminPassword() {
  try {
    // Generate new password hash for 'admin123'
    const passwordHash = await bcrypt.hash("admin123", 10);
    console.log("Updating admin password...");

    // Update the admin user's password
    const [result] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.email, "admin@luxette.com"))
      .returning();

    if (result) {
      console.log("✓ Successfully updated password for:", result.email);
    } else {
      console.log("✗ Admin user not found");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error updating admin password:", error);
    process.exit(1);
  }
}

fixAdminPassword();
