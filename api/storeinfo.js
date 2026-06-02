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

  // --- API สำหรับเพิ่มข้อมูลร้านค้า (กรณีที่ยังไม่มีข้อมูลในระบบ) ---
  router.post('/store-info', async (req, res) => {
    const { address, phone, line, facebook, instagram } = req.body;
    try {
      const sql = 'INSERT INTO Store_info (address, phone, line, facebook, instagram) VALUES (?, ?, ?, ?, ?)';
      await pool.promise().query(sql, [address, phone, line, facebook, instagram]);
      res.json({ message: 'เพิ่มข้อมูลร้านค้าสำเร็จ' });
    } catch (error) {
      console.error("Error inserting Store_info:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
  });

  // --- API สำหรับอัปเดตข้อมูลร้านค้า (กรณีที่มีข้อมูลอยู่แล้ว) ---
  router.put('/store-info/:sid', async (req, res) => {
    const { sid } = req.params;
    const { address, phone, line, facebook, instagram } = req.body;
    try {
      const sql = 'UPDATE Store_info SET address=?, phone=?, line=?, facebook=?, instagram=? WHERE sid=?';
      await pool.promise().query(sql, [address, phone, line, facebook, instagram, sid]);
      res.json({ message: 'อัปเดตข้อมูลร้านค้าสำเร็จ' });
    } catch (error) {
      console.error("Error updating Store_info:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
    }
  });


  router.get('/money-account', async (req, res) => {
    try {
      const sql = 'SELECT * FROM Money_Account';
      const [results] = await pool.promise().query(sql);
      res.json(results); // ส่งกลับเป็น Array ได้เลย
    } catch (error) {
      console.error("Error fetching Money_Account:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี" });
    }
  });

  router.post('/money-account', async (req, res) => {
    const { bank_name, account_number, full_name, status } = req.body;
    try {
      const sql = 'INSERT INTO Money_Account (bank_name, account_number, full_name, status) VALUES (?, ?, ?, ?)';
      // กำหนดค่า status เริ่มต้นเป็น 'Active' หากไม่ได้ส่งมา
      await pool.promise().query(sql, [bank_name, account_number, full_name, status || 'active']);
      res.json({ message: 'เพิ่มข้อมูลบัญชีธนาคารสำเร็จ' });
    } catch (error) {
      console.error("Error inserting Money_Account:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มข้อมูลบัญชี" });
    }
  });

  // --- API สำหรับแก้ไขข้อมูลบัญชีธนาคาร (PUT) ---
  router.put('/money-account/:mid', async (req, res) => {
    const { mid } = req.params;
    const { bank_name, account_number, full_name, status } = req.body;
    try {
      const sql = 'UPDATE Money_Account SET bank_name=?, account_number=?, full_name=?, status=? WHERE mid=?';
      await pool.promise().query(sql, [bank_name, account_number, full_name, status || 'active', mid]);
      res.json({ message: 'อัปเดตข้อมูลบัญชีธนาคารสำเร็จ' });
    } catch (error) {
      console.error("Error updating Money_Account:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลบัญชี" });
    }
  });

  router.get('/deliveryservice', async (req, res) => {
    try {
      const sql = 'SELECT * FROM Delivery_Service_Provider';
      const [results] = await pool.promise().query(sql);
      res.json(results); // ส่งกลับเป็น Array ได้เลย
    } catch (error) {
      console.error("Error fetching Delivery_Service_Provider:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี" });
    }
  });


  router.post('/deliveryservice', async (req, res) => {
    const { name } = req.body;
    try {
      const sql = 'INSERT INTO Delivery_Service_Provider (name, status) VALUES (?, ?)';
      // บังคับสถานะเป็น 'activate' เสมอเมื่อเพิ่มใหม่
      await pool.promise().query(sql, [name, 'activate']);
      res.json({ message: 'เพิ่มข้อมูลบริษัทขนส่งสำเร็จ' });
    } catch (error) {
      console.error("Error inserting Delivery_Service_Provider:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
    }
  });

  
  router.put('/deliveryservice/:did', async (req, res) => {
    const { did } = req.params;
    const { name, status } = req.body;
    try {
      const sql = 'UPDATE Delivery_Service_Provider SET name=?, status=? WHERE did=?';
      await pool.promise().query(sql, [name, status, did]);
      res.json({ message: 'อัปเดตข้อมูลบริษัทขนส่งสำเร็จ' });
    } catch (error) {
      console.error("Error updating Delivery_Service_Provider:", error);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
    }
  });

  return router;
}