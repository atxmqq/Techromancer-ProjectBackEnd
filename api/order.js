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


  router.get('/order', (req, res) => {
    // LEFT JOIN ตาราง Product แยกตามชิ้นส่วนเพื่อดึงชื่อ (name) ออกมา
    const sqlQuery = `
      SELECT 
        o.*, 
        u.fullname, 
        e.username AS updater_name,
        m.bank_name,
        d.name AS delivery_name,
        od.od_id,
        od.pid,
        p.name AS product_name,
        od.amount, 
        od.price,
        od.delivery_type,
        od.order_type,
        od.ctpid,
        
        /* ดึงไอดีชิ้นส่วน */
        c.Cpu, c.Mainboard, c.Vga, c.Ram, c.HDD, c.SSD, c.Power, c.Cases,
        
        /* ดึงชื่อชิ้นส่วนจากตาราง Product */
        p_cpu.name AS cpu_name,
        p_mb.name AS mainboard_name,
        p_vga.name AS vga_name,
        p_ram.name AS ram_name,
        p_hdd.name AS hdd_name,
        p_ssd.name AS ssd_name,
        p_pow.name AS power_name,
        p_cas.name AS cases_name
        
      FROM \`Order\` o
      LEFT JOIN User u ON o.uid = u.uid
      LEFT JOIN Employee e ON o.eid = e.eid
      LEFT JOIN Money_Account m ON o.mid = m.mid
      LEFT JOIN Delivery_Service_Provider d ON o.did = d.did
      LEFT JOIN Order_details od ON o.oid = od.order_id
      LEFT JOIN Product p ON od.pid = p.pid
      
      /* เชื่อมตารางชิ้นส่วนคอมพิวเตอร์ */
      LEFT JOIN Custom_PC c ON od.ctpid = c.ctpid 
      
      /* เชื่อมตาราง Product ซ้ำเพื่อหาชื่อของแต่ละอุปกรณ์ */
      LEFT JOIN Product p_cpu ON c.Cpu = p_cpu.pid
      LEFT JOIN Product p_mb ON c.Mainboard = p_mb.pid
      LEFT JOIN Product p_vga ON c.Vga = p_vga.pid
      LEFT JOIN Product p_ram ON c.Ram = p_ram.pid
      LEFT JOIN Product p_hdd ON c.HDD = p_hdd.pid
      LEFT JOIN Product p_ssd ON c.SSD = p_ssd.pid
      LEFT JOIN Product p_pow ON c.Power = p_pow.pid
      LEFT JOIN Product p_cas ON c.Cases = p_cas.pid
      
      ORDER BY o.oid DESC
    `;

    pool.query(sqlQuery, (err, results) => {
      if (err) {
        console.error('Error fetching orders:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
      }

      const ordersMap = new Map();

      results.forEach(row => {
        if (!ordersMap.has(row.oid)) {
          const orderData = { ...row, order_details: [] };

          // ลบฟิลด์ชั่วคราวที่ไม่ต้องการให้อยู่ในระดับบนสุดออก
          const keysToDelete = [
            'od_id', 'pid', 'product_name', 'amount', 'price', 'delivery_type', 'order_type', 'ctpid',
            'Cpu', 'Mainboard', 'Vga', 'Ram', 'HDD', 'SSD', 'Power', 'Cases',
            'cpu_name', 'mainboard_name', 'vga_name', 'ram_name', 'hdd_name', 'ssd_name', 'power_name', 'cases_name'
          ];
          keysToDelete.forEach(k => delete orderData[k]);
          ordersMap.set(row.oid, orderData);
        }

        if (row.od_id) {
          let itemData = {
            od_id: row.od_id,
            pid: row.pid,
            product_name: row.product_name,
            amount: row.amount,
            price: row.price,
            delivery_type: row.delivery_type,
            order_type: row.order_type,
            ctpid: row.ctpid
          };

          // จัดโครงสร้าง ctpid_details ให้เก็บทั้ง ไอดี และ ชื่อสินค้า ตามที่อยากได้
          if (row.ctpid) {
            itemData.ctpid_details = {
              Cpu: row.Cpu,
              Cpu_name: row.cpu_name,
              Mainboard: row.Mainboard,
              Mainboard_name: row.mainboard_name,
              Vga: row.Vga,
              Vga_name: row.vga_name,
              Ram: row.Ram,
              Ram_name: row.ram_name,
              HDD: row.HDD,
              HDD_name: row.hdd_name,
              SSD: row.SSD,
              SSD_name: row.ssd_name,
              Power: row.Power,
              Power_name: row.power_name,
              Cases: row.Cases,
              Cases_name: row.cases_name
            };
          }

          ordersMap.get(row.oid).order_details.push(itemData);
        }
      });

      res.json(Array.from(ordersMap.values()));
    });
  });



  router.put('/order/update/:oid', (req, res) => {
    const { oid } = req.params;
    const { status, tracking_number, eid, did } = req.body; // รับค่า did เพิ่ม

    if (!status || !eid) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน (ต้องการ status และ eid)' });
    }

    // สร้าง SQL อิงตามว่ามีการส่ง did มาด้วยหรือไม่
    let sqlQuery;
    let queryParams;

    if (did !== undefined) {
      // ถ้ามี did ส่งมาด้วย (ตอนกดเพิ่มเลขพัสดุ) ให้บันทึก did ลงไป
      sqlQuery = `UPDATE \`Order\` SET status = ?, tracking_number = ?, did = ?, eid = ? WHERE oid = ?`;
      queryParams = [status, tracking_number || null, did, eid, oid];
    } else {
      // ถ้าไม่มี did (ตอนกดเปลี่ยนแค่สถานะ) ให้ข้ามการอัปเดต did
      sqlQuery = `UPDATE \`Order\` SET status = ?, tracking_number = ?, eid = ? WHERE oid = ?`;
      queryParams = [status, tracking_number || null, eid, oid];
    }

    pool.query(sqlQuery, queryParams, (err, results) => {
      if (err) {
        console.error('Error updating order:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตออเดอร์' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'ไม่พบออเดอร์รหัสนี้ในระบบ' });
      }

      res.json({ message: 'อัปเดตสถานะออเดอร์และบันทึกข้อมูลพนักงานสำเร็จ!' });
    });
  });


  // API สำหรับอัปเดตวันรับสินค้า (รับที่ร้าน)
  router.put('/order/update-date/:oid', (req, res) => {
    const { oid } = req.params;
    const { date_received, eid } = req.body;

    if (!date_received || !eid) {
      return res.status(400).json({ error: 'กรุณาส่งวันที่รับสินค้าและข้อมูลพนักงาน' });
    }

    // อัปเดตคอลัมน์ date_received ลงในตาราง Order
    const sqlQuery = `UPDATE \`Order\` SET date_received = ?, eid = ? WHERE oid = ?`;

    pool.query(sqlQuery, [date_received, eid, oid], (err, results) => {
      if (err) {
        console.error('Error updating receive date:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกวันรับสินค้า' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'ไม่พบออเดอร์รหัสนี้ในระบบ' });
      }

      res.json({ message: 'บันทึกวันรับสินค้าสำเร็จ!' });
    });
  });


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
      const orderSql = `INSERT INTO \`Order\` (uid, username, order_date, total_price, status, payment_image, mid) VALUES (?, ?, NOW(), ?, 'รอตรวจสอบการชำระเงิน', ?, ?)`;
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
      const orderSql = `INSERT INTO \`Order\` (uid, username, order_date, total_price, status, payment_image, mid) VALUES (?, ?, NOW(), ?, 'รอตรวจสอบการชำระเงิน', ?, ?)`;
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
      // ⭐️ 1. แก้ไขตรงนี้: ดึงข้อมูล Order พร้อม JOIN เอาชื่อขนส่ง (delivery_name) มาด้วย
      const sqlOrder = `
        SELECT o.*, d.name AS delivery_name 
        FROM \`Order\` o
        LEFT JOIN Delivery_Service_Provider d ON o.did = d.did
        WHERE o.oid = ?
      `;
      const [orders] = await connection.query(sqlOrder, [orderId]);

      if (orders.length === 0) return res.status(404).json({ success: false, message: "ไม่พบออเดอร์" });

      // 2. ดึงรายละเอียดสินค้าปกติ (คงเดิม)
      let [details] = await connection.query(`
        SELECT od.*, p.name, p.picture_one, p.price_before 
        FROM Order_details od 
        LEFT JOIN Product p ON od.pid = p.pid 
        WHERE od.order_id = ?
      `, [orderId]);

      // 3. ดึงข้อมูลคอมพิวเตอร์จัดสเปค (ถ้ามี) (คงเดิม)
      for (let item of details) {
        if (item.ctpid) {
          const sqlParts = `
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
          const [parts] = await connection.query(sqlParts, [item.ctpid]);

          // console.log("Parts Data fetched:", parts[0]);

          if (parts.length > 0) item.parts = parts[0];
        }
      }

      // ส่งข้อมูลกลับไปให้ Frontend (ตัว orders[0] จะมี delivery_name และ tracking_number ติดไปด้วยแล้ว)
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
  router.put("/order/cancel/:id", async (req, res) => {
    const orderId = req.params.id;
    const connection = await pool.promise().getConnection();

    try {
      // อัปเดตสถานะในตาราง Order
      const [result] = await connection.query(
        "UPDATE `Order` SET status = 'ยกเลิก' WHERE oid = ?",
        [orderId]
      );

      if (result.affectedRows > 0) {
        res.json({ success: true, message: "ยกเลิกออเดอร์เรียบร้อยแล้ว" });
      } else {
        res.status(404).json({ success: false, message: "ไม่พบรายการสั่งซื้อ" });
      }
    } catch (err) {
      console.error("SQL Error (/order/cancel):", err);
      res.status(500).json({ success: false, message: "Server Error" });
    } finally {
      connection.release();
    }
  });
  // Route สำหรับแก้ไข/อัปเดตสลิปโอนเงิน (PUT /api/order/update-payment/:id)
router.put('/order/update-payment/:id', async (req, res) => {
  const orderId = req.params.id;
  const { payment_image } = req.body;

  if (!payment_image) {
    return res.status(400).json({ success: false, message: "กรุณาส่งข้อมูลรูปภาพมาด้วย" });
  }

  try {
    // อัปเดตรูปภาพใหม่ลงในตาราง Order
    const [result] = await pool.promise().query(
      "UPDATE `Order` SET payment_image = ? WHERE oid = ?",
      [payment_image, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
    }

    res.json({ success: true, message: "อัปเดตหลักฐานการชำระเงินเรียบร้อย" });
  } catch (error) {
    console.error("Error updating payment image:", error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการอัปเดต" });
  }
});
// Route สำหรับบันทึกรีวิว (PUT /api/order/review/:id)
  router.put('/order/review/:id', async (req, res) => {
    const orderId = req.params.id;
    const { review } = req.body;

    if (!review) {
      return res.status(400).json({ success: false, message: "กรุณาส่งข้อความรีวิวมาด้วย" });
    }

    try {
      // ⭐️ บันทึกรีวิวลงในคอลัมน์ review ของตาราง Order
      const [result] = await pool.promise().query(
        "UPDATE `Order` SET review = ? WHERE oid = ?",
        [review, orderId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
      }

      res.json({ success: true, message: "บันทึกรีวิวเรียบร้อย" });
    } catch (error) {
      console.error("Error saving review:", error);
      res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกรีวิว" });
    }
  });
  return router;
}