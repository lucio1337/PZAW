import crypto from "crypto";

function randomBase64(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64");
}

const pepper = randomBase64(32);
const exampleSalt = randomBase64(16);

console.log("Generated PEPPER (use as AUTH_PEPPER):");
console.log(pepper);
console.log("");
console.log("Example salt (for information only; real salts are generated in code per password):");
console.log(exampleSalt);

