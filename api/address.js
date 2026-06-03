import express from 'express';

export default function(pool) {
  const router = express.Router();
  
  // GET /api/address/:uid
  router.get('/:uid', (req, res) => {
    console.log("🔥 มีคนเรียก URL นี้ด้วย UID:", req.params.uid);
    const uid = req.params.uid;
    // ⭐️ เพิ่ม fullname และ phone เข้าไปใน SQL
    pool.query('SELECT address, fullname, phone FROM User WHERE uid = ?', [uid], (err, results) => {
      if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
      
      if (results.length > 0) {
        // ส่งข้อมูลให้ตรงกับที่หน้าเว็บต้องการ
        res.json({
            address: results[0].address || '',
            fullname: results[0].fullname || '',
            phone: results[0].phone || ''
        }); 
      } else {
        res.json({ address: '', fullname: '', phone: '' });
      }
    });
});

  // POST /api/address/add
  // POST /api/address/add
  router.post('/add', (req, res) => {
    const { uid, address } = req.body;

    if (!uid || !address || address.trim() === '') {
      return res.status(400).json({ error: 'uid และ address ต้องไม่ว่าง' });
    }

    // ทำการ UPDATE ที่อยู่ใหม่ทับลงไปในคอลัมน์ address ของ User เลย
    pool.query(
      'UPDATE User SET address = ? WHERE uid = ?',
      [address.trim(), uid],
      (err, result) => {
        if (err) {
          console.error('❌ Error updating address:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตที่อยู่' });
        }
        res.json({ message: 'เพิ่มที่อยู่สำเร็จ', uid, address: address.trim() });
      }
    );
  });

  router.put('/update', (req, res) => {
    const { uid, newAddress } = req.body;

    // เนื่องจากมีที่เดียว คือ address ไม่ต้องใช้ CASE WHEN
    pool.query(
      'UPDATE User SET address = ? WHERE uid = ?',
      [newAddress, uid],
      (err, result) => {
        if (err) {
          console.error('❌ Error updating address:', err);
          return res.status(500).json({ error: 'อัปเดตที่อยู่ล้มเหลว' });
        }
        res.json({ message: 'อัปเดตที่อยู่สำเร็จ' });
      }
    );
  });

  return router;
}
