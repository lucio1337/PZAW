import db from "./database.js";
import { initializeDatabase } from "./database.js";
import crypto from "crypto";
import { hash as argon2hash } from "@node-rs/argon2";
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
  return argon2hash(password + PEPPER);
}

const existing = db.prepare("SELECT id, is_admin FROM users WHERE username = ?").get(username);
if (existing) {
  const newHash = await hashPassword(password);
  db.prepare("UPDATE users SET password = ?, is_admin = 1 WHERE id = ?").run(newHash, existing.id);
  console.log(`Updated user "${username}" to admin with new password.`);
} else {
  const newHash = await hashPassword(password);
  db.prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)").run(username, newHash);
  console.log(`Created admin user "${username}" with password "${password}".`);
}
