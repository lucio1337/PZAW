import db from "./database.js";
import { initializeDatabase } from "./database.js";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

initializeDatabase();

const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "admin123";

let PEPPER = "";
const pepperPath = join(__dirname, "auth_pepper.txt");
if (fs.existsSync(pepperPath)) {
  PEPPER = fs.readFileSync(pepperPath, "utf-8").trim();
} else {
  PEPPER = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(pepperPath, PEPPER);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password + PEPPER).digest("hex");
  return `${salt}$${hash}`;
}

const existing = db.prepare("SELECT id, is_admin FROM users WHERE username = ?").get(username);
if (existing) {
  db.prepare("UPDATE users SET password = ?, is_admin = 1 WHERE id = ?").run(hashPassword(password), existing.id);
  console.log(`Updated user "${username}" to admin with new password.`);
} else {
  db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)").run(username, hashPassword(password));
  console.log(`Created admin user "${username}" with password "${password}". Change password after first login.`);
}
