import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";

const serviceAccount = JSON.parse(
  fs.readFileSync("./techromancer-project-firebase-adminsdk-fbsvc-afb4e4ee9d.json", "utf-8") // <- ต้องตรงพาธจริง
);


initializeApp({
  credential: cert(serviceAccount),
  // storageBucket: "techromancer-project.appspot.com"
  storageBucket: "techromancer-project.firebasestorage.app"
});

export const bucket = getStorage().bucket();