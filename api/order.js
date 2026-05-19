import express from "express";
import multer from "multer"; // ⭐️ 1. นำเข้า multer
import path from "path";     // ⭐️ 2. นำเข้า path
import fs from "fs";         // ⭐️ 3. นำเข้า fs

export default function (pool) {
  const router = express.Router();

  // ==========================================
  // ⭐️ ส่วนของการตั้งค่า Multer สำหรับอัปโหลดรูป
  // ==========================================
  
  // เช็คว่ามีโฟลเดอร์ uploads ไหม ถ้าไม่มีให้สร้างอัตโนมัติ
  const uploadDir = './uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  // ตั้งค่าการเก็บไฟล์ (โฟลเดอร์ uploads และตั้งชื่อไฟล์ไม่ให้ซ้ำ)
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // ตั้งชื่อไฟล์ใหม่ ป้องกันชื่อซ้ำ
      cb(null, 'slip-' + Date.now() + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage: storage })

  // ⭐️ API สำหรับรับไฟล์สลิป (ต้องอยู่ก่อน order/add)
  router.post('/upload-slip', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'ไม่ได้แนบไฟล์มา' });
      }
      
      // ✅ สร้างลิงก์รูปภาพ (ชี้ไปที่โฟลเดอร์ uploads ในเครื่องเรา)
      const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
      
      console.log("✅ อัปโหลดรูปลงเครื่องสำเร็จ:", fileUrl);
      res.json({ success: true, url: fileUrl });
      
    } catch (error) {
      console.error("❌ Upload error:", error);
      res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์มีปัญหาในการอัปโหลดไฟล์' });
    }
  });

  // ==========================================
  // ส่วนของ Order API
  // ==========================================

  router.get('/order/:uid', (req, res) => {
    const { uid } = req.params;

    const sqlQuery = `
        SELECT 
            od.*, 
            p.name, 
            p.picture_one
        FROM 
            Order_details AS od
        INNER JOIN 
            Product AS p ON od.pid = p.pid
        WHERE 
            od.uid = ?
    `;

    pool.query(sqlQuery, [uid], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'ไม่พบออเดอร์' });
      }
      res.json(results);
    });
  });

  router.post("/order/add", async (req, res) => {
    const connection = await pool.promise().getConnection();
    try {
      const orders = req.body;
      if (!Array.isArray(orders) || orders.length === 0) {
        return res.json({ success: false, message: "ไม่มีข้อมูลออเดอร์" });
      }

      const uid = orders[0].uid;
      const total_price = orders.reduce((sum, o) => sum + o.price, 0);
      const delivery_type = orders[0].delivery_type || "จัดส่งปกติ";
      const address = orders[0].address || null;
      
      // ⭐️ รับค่า URL รูปสลิปที่ React ส่งมา
      const payment_image = orders[0].payment_image || null; 

      await connection.beginTransaction();

      const [userRows] = await connection.query(
        "SELECT username FROM User WHERE uid = ?",
        [uid]
      );
      const username = userRows.length > 0 ? userRows[0].username : null;

      // ⭐️ บันทึกรูปลงตาราง Order ด้วยตัวแปร payment_image
      const orderSql = `
        INSERT INTO \`Order\` 
        (uid, order_date, total_price, status, tracking_number, username, did, eid, mid, payment_image)
        VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [orderResult] = await connection.query(orderSql, [
        uid,
        total_price,
        "จัดเตรียมสินค้า", 
        null,        
        username,
        null,        
        null,         
        1,             
        payment_image 
      ]);

      const orderId = orderResult.insertId;

      const detailSql = `
        INSERT INTO Order_details (order_id, uid, pid, amount, price, address, delivery_type)
        VALUES ?;
      `;

      const values = orders.map(o => [
        orderId,
        uid,
        o.pid,
        o.amount,
        o.price,
        address,           
        delivery_type,
      ]);

      await connection.query(detailSql, [values]);

      // 🔹 ลบตะกร้า
      await connection.query("DELETE FROM Cart WHERE uid = ?", [uid]);

      await connection.commit();

      res.json({ 
        success: true, 
        message: "เพิ่มออเดอร์สำเร็จ", 
        order_id: orderId 
      });

    } catch (err) {
      console.error("❌ Error saving order:", err);
      await connection.rollback();
      res.status(500).json({ success: false, message: "บันทึกออเดอร์ล้มเหลว" });
    } finally {
      connection.release();
    }
  });

  return router;
}