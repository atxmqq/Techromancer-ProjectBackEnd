import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function (pool) {
  const router = express.Router();

  // --- API รับสลิป (เหมือนเดิม) ---
  const uploadDir = path.join(__dirname, 'uploads'); // ใช้ __dirname เพื่อระบุตำแหน่งที่แน่นอน
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, 'slip-' + Date.now() + path.extname(file.originalname))
});
  const upload = multer({ storage: storage });

  router.post('/upload-slip', upload.single('file'), (req, res) => {
    try {
        console.log("ได้รับไฟล์แล้ว:", req.file); // เช็คว่า Server ได้รับไฟล์ไหม

        if (!req.file) {
            console.log("ไม่มีไฟล์ส่งมา");
            return res.status(400).json({ success: false, message: 'ไม่ได้แนบไฟล์มา' });
        }
        
        // ส่ง response กลับไป
        res.json({ success: true, url: `http://localhost:3001/uploads/${req.file.filename}` });
        
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการอัปโหลด:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

  // --- API สำหรับสั่งซื้อจากตะกร้า (เดิม) ---
  router.post("/order/add", async (req, res) => {
    console.log("ข้อมูลที่ได้รับจาก Frontend:", req.body);
    const connection = await pool.promise().getConnection();
    try {
      const orders = req.body;
      const uid = orders[0].uid;
      const total_price = orders.reduce((sum, o) => sum + o.price, 0);
      const payment_image = orders[0].payment_image || null;

      await connection.beginTransaction();
      
      const [userRows] = await connection.query("SELECT username FROM User WHERE uid = ?", [uid]);
      const username = userRows.length > 0 ? userRows[0].username : null;

      // 🔴 แก้ไขตรงนี้: 
      // 1. เรียงลำดับ Column ใหม่ให้ตรงกับค่าที่จะใส่
      // 2. ใช้ ? ตรง uid และ ใส่ NOW() ที่ช่อง order_date
      const orderSql = `INSERT INTO \`Order\` (uid, order_date, total_price, status, username, payment_image) VALUES (?, NOW(), ?, ?, ?, ?)`;
      
      // 3. ส่งข้อมูล 5 ค่าให้ตรงกับเครื่องหมาย ? 5 อัน
      const [orderResult] = await connection.query(orderSql, [uid, total_price, "จัดเตรียมสินค้า", username, payment_image]);

      const orderId = orderResult.insertId;
      const values = orders.map(o => [orderId, uid, o.pid, o.amount, o.price]);
      
      await connection.query("INSERT INTO Order_details (order_id, uid, pid, amount, price) VALUES ?", [values]);
      await connection.query("DELETE FROM Cart WHERE uid = ?", [uid]);

      await connection.commit();
      res.json({ success: true, order_id: orderId });
    } catch (err) {
      await connection.rollback();
      console.error("Error Detail:", err); // เพิ่มบรรทัดนี้เพื่อดู Error ใน Terminal
      res.status(500).json({ success: false, message: "บันทึกออเดอร์ล้มเหลว" });
    } finally {
      connection.release();
    }
  });

  router.post("/orders/build", async (req, res) => {
    console.log("🔥 เช็คค่า mid ที่ได้รับจาก Frontend:", req.body.mid);
  const { uid, items, address_details, order_type, shipping_method, total_price, payment_image, mid } = req.body;
  console.log("DEBUG - ข้อมูลที่ได้รับ:", { uid, order_type, mid, payment_image });
  const connection = await pool.promise().getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [userRows] = await connection.query("SELECT username FROM User WHERE uid = ?", [uid]);
    const username = userRows.length > 0 ? userRows[0].username : null;

    // 1. บันทึก Order (ต้องแน่ใจว่าตาราง Order มีคอลัมน์ payment_image และ mid)
    const orderSql = `
      INSERT INTO \`Order\` (uid, username, order_date, total_price, status, payment_image, mid) 
      VALUES (?, ?, NOW(), ?, 'จัดเตรียมสินค้า', ?, ?)
    `;
    console.log("INSERT Order ด้วย mid:", mid);
    const [orderResult] = await connection.query(orderSql, [
        uid, 
        username, 
        total_price, 
        payment_image || null, 
        mid || null 
    ]);
    const orderId = orderResult.insertId;

    // 2. บันทึก Custom_PC
    const buildSql = `
      INSERT INTO Custom_PC (Cpu, Mainboard, Vga, Ram, HDD, SSD, Power, Cases) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const findItem = (id) => items.find(i => i.pc_id === id)?.pid || null;

    const [buildResult] = await connection.query(buildSql, [
      findItem(1), // Cpu
      findItem(3), // Mainboard
      findItem(9), // Vga
      findItem(2), // Ram
      findItem(4), // HDD
      findItem(5), // SSD
      findItem(6), // Power
      findItem(7)  // Cases
    ]);
    const ctpid = buildResult.insertId;
    // const [buildResult] = await connection.query(buildSql, [
    //   items[1]?.pid || null, items[3]?.pid || null, items[9]?.pid || null, 
    //   items[2]?.pid || null, items[4]?.pid || null, items[5]?.pid || null, 
    //   items[6]?.pid || null, items[7]?.pid || null
    // ]);
    // const ctpid = buildResult.insertId;

    // 3. บันทึก Order_details
    const detailSql = `
      INSERT INTO Order_details 
      (order_id, uid, ctpid, amount, price, address, delivery_type, order_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.query(detailSql, [
  orderId, uid, ctpid, 1, total_price, address_details, shipping_method, order_type 
]);

    await connection.commit();
    res.json({ success: true, order_id: orderId });
    
  } catch (err) {
    await connection.rollback();
    console.error("❌ SQL Error รายละเอียด:", err.sqlMessage);
    res.status(500).json({ success: false, message: "บันทึกออเดอร์จัดสเปคล้มเหลว" });
  } finally {
    connection.release();
  }
});

  // --- เพิ่ม Route สำหรับดึงรายละเอียดออเดอร์ (GET) ---
router.get("/order/:id", async (req, res) => {
  const orderId = req.params.id; 
  const connection = await pool.promise().getConnection();
  
  try {
    // 🔴 แก้ไขตรงนี้: เปลี่ยน WHERE order_id = ? เป็น WHERE oid = ?
    const [orders] = await connection.query("SELECT * FROM `Order` WHERE oid = ?", [orderId]); 
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลออเดอร์" });
    }

    // 🔵 ส่วนตรงนี้ 'Order_details' ถ้าในตารางนี้คุณตั้งชื่อ Column ว่า order_id อยู่แล้ว ก็ให้คงไว้เหมือนเดิมครับ
    const [details] = await connection.query("SELECT * FROM Order_details WHERE order_id = ?", [orderId]);

    res.json({ success: true, order: orders[0], details: details });
    
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการดึงออเดอร์:", err);
    res.status(500).json({ success: false, message: "เซิร์ฟเวอร์มีปัญหา" });
  } finally {
    connection.release();
  }
});

router.get("/payment-info", async (req, res) => {
  const connection = await pool.promise().getConnection();
  try {
    // ดึงบัญชีที่ status = 'activate'
    const [rows] = await connection.query("SELECT * FROM Money_Account WHERE status = 'activate' LIMIT 1");
    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] });
    } else {
      res.status(404).json({ success: false, message: "ไม่พบบัญชีธนาคาร" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    connection.release();
  }
});

  return router;
}