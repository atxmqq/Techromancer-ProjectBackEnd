import express from "express";

export default function (pool) {
  const router = express.Router();

  router.get('/order/:uid', (req, res) => {
    const { uid } = req.params;

    // SQL query ที่มีการ JOIN ตาราง
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
        console.error(err); // แสดง error ใน console เพื่อช่วย debug
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
    const orders = req.body; // ตัวนี้ยังเป็น array ของสินค้าที่จะสั่ง
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.json({ success: false, message: "ไม่มีข้อมูลออเดอร์" });
    }

    const uid = orders[0].uid;
    const total_price = orders.reduce((sum, o) => sum + o.price, 0);
    const delivery_type = orders[0].delivery_type || "จัดส่งปกติ";
    const address = orders[0].address || null; // จาก selectedAddress

    await connection.beginTransaction();

    // 🔹 ดึง username จาก uid
    const [userRows] = await connection.query(
      "SELECT username FROM User WHERE uid = ?",
      [uid]
    );
    const username = userRows.length > 0 ? userRows[0].username : null;

    // 🔹 Insert ลง Order
    const orderSql = `
      INSERT INTO \`Order\` 
      (uid, order_date, total_price, status, tracking_number, username, did, eid, mid)
      VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?)
    `;
    const [orderResult] = await connection.query(orderSql, [
      uid,
      total_price,
      "รอจัดส่ง",   // สถานะเริ่มต้น
      null,          // tracking_number
      username,
      null,          // did
      null,          // eid
      1,             // mid = วิธีชำระเงิน (1 = พร้อมเพย์)
    ]);

    const orderId = orderResult.insertId;

    // 🔹 Insert ลง Order_details
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
      address,           // ใช้ที่อยู่ที่เลือกใน dropdown
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
