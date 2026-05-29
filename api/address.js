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
  router.post('/add', (req, res) => {
    const { uid, address } = req.body;

    if (!uid || !address || address.trim() === '') {
      return res.status(400).json({ error: 'uid และ address ต้องไม่ว่าง' });
    }

    // ดึงข้อมูล address ปัจจุบันก่อน
    pool.query('SELECT address, address_two FROM User WHERE uid = ?', [uid], (err, results) => {
      if (err) {
        console.error('❌ Error fetching user address:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลที่อยู่' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'ไม่พบผู้ใช้ที่ uid นี้' });
      }

      const user = results[0];

      // ฟังก์ชันตรวจสอบว่าค่าที่อยู่ "ว่าง" หรือไม่ (null, undefined, empty string, หรือ string ที่เป็น space)
      function isEmptyAddress(addr) {
        return !addr || addr.trim() === '';
      }

      if (isEmptyAddress(user.address)) {
        // address ว่าง ให้ UPDATE address
        pool.query(
          'UPDATE User SET address = ? WHERE uid = ?',
          [address.trim(), uid],
          (err, result) => {
            if (err) {
              console.error('❌ Error updating address:', err);
              return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพเดตที่อยู่' });
            }
            res.json({ message: 'เพิ่มที่อยู่สำเร็จในช่อง address', uid, address: address.trim() });
          }
        );
      } else if (isEmptyAddress(user.address_two)) {
        // address_two ว่าง ให้ UPDATE address_two
        pool.query(
          'UPDATE User SET address_two = ? WHERE uid = ?',
          [address.trim(), uid],
          (err, result) => {
            if (err) {
              console.error('❌ Error updating address_two:', err);
              return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัพเดตที่อยู่' });
            }
            res.json({ message: 'เพิ่มที่อยู่สำเร็จในช่อง address_two', uid, address_two: address.trim() });
          }
        );
      } else {
        // ทั้ง 2 ช่องเต็มแล้ว
        res.status(400).json({ error: 'มีที่อยู่จัดส่งครบ 2 ช่องแล้ว ไม่สามารถเพิ่มได้' });
      }
    });
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
