import express from 'express';

export default function (pool) {
  const router = express.Router();

  // Route สำหรับดึงข้อมูลร้านค้า (จะถูกเรียกผ่าน /api/store-info)
  router.get('/store-info', async (req, res) => {
    try {
      // ดึงข้อมูลจากตาราง Store_info (เอามาแค่ 1 แถวแรก)
      const sql = 'SELECT * FROM Store_info LIMIT 1';
      
      const [results] = await pool.promise().query(sql);

      if (results.length > 0) {
        // ถ้ามีข้อมูล ให้ส่งก้อนแรกกลับไป
        res.json(results[0]);
      } else {
        // ถ้าตารางว่างเปล่า ให้ส่ง Object ว่างๆ กลับไป
        res.json({});
      }
    } catch (error) {
      console.error("Error fetching Store_info:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า" });
    }
  });

  return router;
}