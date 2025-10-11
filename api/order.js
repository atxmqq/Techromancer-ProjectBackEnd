import express from "express";

export default function (pool) {
  const router = express.Router();

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
        INSERT INTO Order_details (uid, pid, cid, amount, price, delivery_type)
        VALUES ?;
      `;
      const values = orders.map(o => [
        o.uid,
        o.pid,
        o.cid,
        o.amount,
        o.price,
        o.delivery_type,
      ]);
      await connection.query(insertSql, [values]);

      const uid = orders[0].uid;

      // ✅ ตัดการอ้างอิง cid ก่อนลบ Cart (ป้องกัน Foreign key error)
      await connection.query("UPDATE Order_details SET cid = NULL WHERE uid = ?", [uid]);

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
