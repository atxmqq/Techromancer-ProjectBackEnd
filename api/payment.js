// routes/payment.js (โค้ดที่แก้ไขแล้ว)
import express from "express";
import multer from "multer";
import { bucket } from "../firebase.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/upload-slip
 * อัปโหลดสลิปชำระเงินไป Firebase Storage
 * ต้องส่ง:
 * - file (ไฟล์สลิป)
 * - orderId (เลขที่ออเดอร์)  <- เปลี่ยนจาก uid เป็น orderId
 */
router.post("/upload-slip", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    // 💡 เปลี่ยนมาใช้ orderId แทน uid ในการตั้งชื่อไฟล์
    const orderId = req.body.orderId; 
    const timestamp = Date.now();

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // 💡 ตรวจสอบ orderId
    if (!orderId) {
      return res.status(400).json({ success: false, error: "No Order ID provided" });
    }

    // --- ส่วนสร้างโฟลเดอร์ตามวัน (คงไว้) ---
    const now = new Date();
    const dateFolder = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    // --- สิ้นสุดส่วนสร้างโฟลเดอร์ตามวัน ---

    // 💡 สร้างชื่อไฟล์ไม่ซ้ำ: payments/DD-MM-YYYY/order_[orderId]_timestamp
    const fileName = `payments/${dateFolder}/order_${orderId}_${timestamp}_${file.originalname}`;
    const fileRef = bucket.file(fileName);

    // อัปโหลดไฟล์ขึ้น Firebase
    await fileRef.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    // สร้าง signed URL ให้เข้าถึงไฟล์ได้
    const [url] = await fileRef.getSignedUrl({
      action: "read",
      expires: "03-01-2030",
    });

    console.log(`✅ File uploaded: ${fileName}`);
    return res.json({ success: true, url });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    return res.status(500).json({ success: false, error: "Upload failed" });
  }
});

export default router;