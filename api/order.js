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
  const orders = req.body; 
  const connection = await pool.promise().getConnection();
  
  try {
    const uid = orders[0].uid;
    const payment_image = orders[0].payment_image;
    const mid = orders[0].mid;
    const address = orders[0].address;
    const delivery = orders[0].delivery_type;
    const order_type = orders[0].order_type;
    
    // ✅ คำนวณราคาใหม่: (ราคาสินค้า * จำนวน) + ค่าส่ง
    const productTotal = orders.reduce((sum, o) => sum + (Number(o.price) * Number(o.amount)), 0);
    const shippingFee = orders[0].shipping_fee || 0; 
    const total_price = productTotal + shippingFee;

    await connection.beginTransaction();
    
    // 1. บันทึก Order
    const [userRows] = await connection.query("SELECT username FROM User WHERE uid = ?", [uid]);
    const username = userRows.length > 0 ? userRows[0].username : null;
    const orderSql = `INSERT INTO \`Order\` (uid, username, order_date, total_price, status, payment_image, mid) VALUES (?, ?, NOW(), ?, 'จัดเตรียมสินค้า', ?, ?)`;
    const [orderResult] = await connection.query(orderSql, [uid, username, total_price, payment_image, mid]);
    const orderId = orderResult.insertId;

    // 2. บันทึก Order_details
    const values = orders.map(o => [orderId, uid, o.pid, null, o.amount, o.price, address, delivery, order_type]);
    const detailSql = `INSERT INTO Order_details (order_id, uid, pid, ctpid, amount, price, address, delivery_type, order_type) VALUES ?`;
    
    await connection.query(detailSql, [values]);
    await connection.query("DELETE FROM Cart WHERE uid = ?", [uid]);

    await connection.commit();
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await connection.rollback();
    console.error("SQL Error (/order/add):", err.sqlMessage);
    res.status(500).json({ success: false, message: err.sqlMessage });
  } finally {
    connection.release();
  }
});

  router.post("/orders/build", async (req, res) => {
  const { uid, items, address_details, order_type, shipping_method, total_price, payment_image, mid } = req.body;
  const connection = await pool.promise().getConnection();
  
  try {
    await connection.beginTransaction();
    
    // สร้างตาราง Custom_PC
    const buildSql = `INSERT INTO Custom_PC (Cpu, Mainboard, Vga, Ram, HDD, SSD, Power, Cases) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const findItem = (id) => items.find(i => i.pc_id === id)?.pid || null;
    const [buildResult] = await connection.query(buildSql, [
      findItem(1), findItem(3), findItem(9), findItem(2), findItem(4), findItem(5), findItem(6), findItem(7)
    ]);
    const ctpid = buildResult.insertId;

    // บันทึก Order
    const [userRows] = await connection.query("SELECT username FROM User WHERE uid = ?", [uid]);
    const username = userRows.length > 0 ? userRows[0].username : null;
    const orderSql = `INSERT INTO \`Order\` (uid, username, order_date, total_price, status, payment_image, mid) VALUES (?, ?, NOW(), ?, 'จัดเตรียมสินค้า', ?, ?)`;
    const [orderResult] = await connection.query(orderSql, [uid, username, total_price, payment_image, mid]);
    const orderId = orderResult.insertId;

    // บันทึก Order_details (pid เป็น NULL)
    // เรียง: order_id, uid, pid, ctpid, amount, price, address, delivery_type, order_type
    const detailSql = `INSERT INTO Order_details (order_id, uid, pid, ctpid, amount, price, address, delivery_type, order_type) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`;
    
    await connection.query(detailSql, [orderId, uid, ctpid, 1, total_price, address_details, shipping_method, order_type]);

    await connection.commit();
    res.json({ success: true, order_id: orderId });
  } catch (err) {
    await connection.rollback();
    console.error("SQL Error (/orders/build):", err.sqlMessage);
    res.status(500).json({ success: false, message: err.sqlMessage });
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
router.get("/order/:id", async (req, res) => {
  const orderId = req.params.id;
  const connection = await pool.promise().getConnection();
  
  try {
    const [orders] = await connection.query("SELECT * FROM `Order` WHERE oid = ?", [orderId]);
    if (orders.length === 0) return res.status(404).json({ success: false });

    // 1. ดึงรายละเอียดสินค้าปกติ
    let [details] = await connection.query(`
      SELECT od.*, p.name, p.picture_one, p.price_before 
      FROM Order_details od 
      LEFT JOIN Product p ON od.pid = p.pid 
      WHERE od.order_id = ?
    `, [orderId]);

    // 2. ดึงข้อมูลคอมพิวเตอร์จัดสเปค (ถ้ามี)
    for (let item of details) {
      if (item.ctpid) {
        const sql = `
  SELECT c.*, 
         p1.name as cpu_name, p1.price_before as cpu_price, p1.picture_one as cpu_img,
         p2.name as mb_name, p2.price_before as mb_price, p2.picture_one as mb_img,
         p3.name as vga_name, p3.price_before as vga_price, p3.picture_one as vga_img,
         p4.name as ram_name, p4.price_before as ram_price, p4.picture_one as ram_img,
         p5.name as hdd_name, p5.price_before as hdd_price, p5.picture_one as hdd_img,
         p6.name as ssd_name, p6.price_before as ssd_price, p6.picture_one as ssd_img,
         p7.name as power_name, p7.price_before as power_price, p7.picture_one as power_img,
         p8.name as case_name, p8.price_before as case_price, p8.picture_one as case_img
  FROM Custom_PC c
  LEFT JOIN Product p1 ON c.Cpu = p1.pid
  LEFT JOIN Product p2 ON c.Mainboard = p2.pid
  LEFT JOIN Product p3 ON c.Vga = p3.pid
  LEFT JOIN Product p4 ON c.Ram = p4.pid
  LEFT JOIN Product p5 ON c.HDD = p5.pid
  LEFT JOIN Product p6 ON c.SSD = p6.pid
  LEFT JOIN Product p7 ON c.Power = p7.pid
  LEFT JOIN Product p8 ON c.Cases = p8.pid
  WHERE c.ctpid = ?
`;
        const [parts] = await connection.query(sql, [item.ctpid]);
        
        // ⭐️ เช็คข้อมูลที่ดึงมาว่ามีราคาไหม
        console.log("Parts Data fetched:", parts[0]);
        
        if (parts.length > 0) item.parts = parts[0]; 
      }
    }
    res.json({ success: true, order: orders[0], details: details });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  } finally {
    connection.release();
  }
});
router.get("/order/user/:uid", async (req, res) => {
  const uid = req.params.uid;
  const connection = await pool.promise().getConnection();
  try {
    // ⭐️ เพิ่มการดึงข้อมูลโดยใช้ MAX เพื่อเลี่ยงค่า NULL ถ้าเป็นไปได้
    const sql = `
      SELECT o.*, od.order_type, 
             MAX(p.name) as product_name, 
             MAX(p.picture_one) as picture_one
      FROM \`Order\` o
      LEFT JOIN Order_details od ON o.oid = od.order_id
      LEFT JOIN Product p ON od.pid = p.pid
      WHERE o.uid = ?
      GROUP BY o.oid
      ORDER BY o.order_date DESC
    `;
    const [orders] = await connection.query(sql, [uid]);
    res.json({ success: true, orders: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "ดึงข้อมูลล้มเหลว" });
  } finally {
    connection.release();
  }
});

  return router;
}