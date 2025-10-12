// routes/payment.js
import express from "express";
import multer from "multer";
import { bucket } from "../firebase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/upload-slip
 * อัปโหลดสลิปชำระเงินไป Firebase Storage
 * ต้องส่ง:
 *  - file (ไฟล์สลิป)
 *  - uid (ผู้ใช้)
 */
router.post("/upload-slip", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const uid = req.body.uid;
    const timestamp = Date.now();

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    if (!uid) {
      return res.status(400).json({ success: false, error: "No UID provided" });
    }

    // สร้างชื่อไฟล์ไม่ซ้ำ
    const fileName = `payments/${uid}_${timestamp}_${file.originalname}`;
    const fileRef = bucket.file(fileName);

    // อัปโหลดไฟล์ขึ้น Firebase
    await fileRef.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    // สร้าง signed URL ให้เข้าถึงไฟล์ได้
    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: "03-01-2030", // กำหนดวันหมดอายุ
    });

    console.log(`✅ File uploaded: ${fileName}`);
    return res.json({ success: true, url });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return res.status(500).json({ success: false, error: "Upload failed" });
  }
});

export default router;
