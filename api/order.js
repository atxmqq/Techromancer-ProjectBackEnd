// api/order.js
import express from "express";

export default function (pool) {
  const router = express.Router();

  // เพิ่มออเดอร์หลายรายการ
  router.post("/order/add", async (req, res) => {
    try {
      const orders = req.body; // เป็น array ของ order details

      if (!Array.isArray(orders) || orders.length === 0) {
        return res.json({ success: false, message: "ไม่มีข้อมูลออเดอร์" });
      }

      const sql = `
        INSERT INTO Order_details (oid, uid, pid, cid, amount, price, delivery_type)
        VALUES ?;
      `;

      const values = orders.map(o => [
        o.oid,
        o.uid,
        o.pid,
        o.cid,
        o.amount,
        o.price,
        o.delivery_type,
      ]);

      // ใช้ pool.query เพื่อรองรับ async/await
      await pool.promise().query(sql, [values]);

      res.json({ success: true, message: "เพิ่มออเดอร์สำเร็จ" });
    } catch (err) {
      console.error("❌ Error inserting order:", err);
      res.status(500).json({ success: false, message: "บันทึกออเดอร์ล้มเหลว" });
    }
  });

  return router;
}
