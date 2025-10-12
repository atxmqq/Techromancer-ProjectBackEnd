import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// 👇 เพื่อใช้ __dirname ใน ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "techromancer-project-firebase-adminsdk-fbsvc-afb4e4ee9d.json"),
    "utf-8"
  )
);

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "techromancer-project.firebasestorage.app", // ✅ ใช้ชื่อนี้ตรง ๆ
});

export const bucket = getStorage().bucket(); // ✅ export ถูกต้องแบบ ES Module
