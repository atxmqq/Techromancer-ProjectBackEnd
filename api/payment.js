// backend/routes/payment.js
import express from "express";
import multer from "multer";
import { bucket } from "../firebase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-slip", upload.single("slip"), async (req, res) => {
  try {
    const file = req.file;
    const uid = req.body.uid;
    const timestamp = Date.now();

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const fileName = `payments/${uid}_${timestamp}_${file.originalname}`;
    const fileRef = bucket.file(fileName);

    await fileRef.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    // URL สำหรับเข้าถึงรูป
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

export default router;
