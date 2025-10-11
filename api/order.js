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
            p.picture 
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
      const orders = req.body;
      if (!Array.isArray(orders) || orders.length === 0) {
        return res.json({ success: false, message: "ไม่มีข้อมูลออเดอร์" });
      }

      await connection.beginTransaction();

      // ✅ Insert order details
      const insertSql = `
        INSERT INTO Order_details (uid, pid, amount, price, delivery_type)
        VALUES ?;
      `;
      const values = orders.map(o => [
        o.uid,
        o.pid,
        o.amount,
        o.price,
        o.delivery_type,
      ]);
      await connection.query(insertSql, [values]);

      const uid = orders[0].uid;

      // ✅ ลบตะกร้าของ uid นี้
      await connection.query("DELETE FROM Cart WHERE uid = ?", [uid]);

      await connection.commit();
      res.json({ success: true, message: "เพิ่มออเดอร์สำเร็จและล้างตะกร้าเรียบร้อย" });
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
