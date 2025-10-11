// api/cartRoute.js
import express from 'express';

export default function (pool) {
  const router = express.Router();

  // เพิ่มสินค้าลงตะกร้า
  router.post('/cart/add', (req, res) => {
  const { uid, pid, amount } = req.body;

  if (!uid || !pid || !amount || isNaN(amount)) {
    return res.status(400).json({ error: 'กรุณาระบุ uid, pid และ amount ที่ถูกต้อง' });
  }

  const amt = Number(amount);
  if (amt === 0) {
    return res.status(400).json({ error: 'จำนวนสินค้าต้องไม่เป็น 0' });
  }

  // เช็คว่ามีสินค้านี้ในตะกร้าแล้วหรือไม่
  pool.query(
    'SELECT amount FROM Cart WHERE uid = ? AND pid = ?',
    [uid, pid],
    (err, results) => {
      if (err) {
        console.error('❌ Error checking cart:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
      }

      if (results.length > 0) {
        const currentAmount = results[0].amount;
        const newAmount = currentAmount + amt;

        if (newAmount <= 0) {
          // ลบสินค้าจากตะกร้า
          pool.query(
            'DELETE FROM Cart WHERE uid = ? AND pid = ?',
            [uid, pid],
            (err2) => {
              if (err2) {
                console.error('❌ Error deleting cart item:', err2);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
              }
              res.json({ message: 'ลบสินค้าออกจากตะกร้าแล้ว เนื่องจากจำนวนสินค้าลดลงจนเหลือ 0 หรือ น้อยกว่า' });
            }
          );
        } else {
          // อัปเดตจำนวนใหม่
          pool.query(
            'UPDATE Cart SET amount = ? WHERE uid = ? AND pid = ?',
            [newAmount, uid, pid],
            (err2) => {
              if (err2) {
                console.error('❌ Error updating cart:', err2);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดต' });
              }
              res.json({ message: 'อัปเดตจำนวนสินค้าในตะกร้าแล้ว', newAmount });
            }
          );
        }
      } else {
        if (amt <= 0) {
          return res.status(400).json({ error: 'ไม่สามารถเพิ่มสินค้าจำนวนติดลบหรือ 0 ในตะกร้าใหม่ได้' });
        }
        // เพิ่มแถวใหม่
        pool.query(
          'INSERT INTO Cart (uid, pid, amount) VALUES (?, ?, ?)',
          [uid, pid, amt],
          (err3) => {
            if (err3) {
              console.error('❌ Error inserting cart:', err3);
              return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า' });
            }
            res.json({ message: 'เพิ่มสินค้าลงในตะกร้าแล้ว' });
          }
        );
      }
    }
  );
});

  router.get('/cart/:uid', (req, res) => {
  const { uid } = req.params;

  const sql = `
    SELECT c.pid, c.cid, c.amount, p.name, p.price_before, p.picture
    FROM Cart c
    JOIN Product p ON c.pid = p.pid
    WHERE c.uid = ?
  `;

  pool.query(sql, [uid], (err, results) => {
    if (err) {
      console.error('❌ Error fetching cart:', err);
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลตะกร้า' });
    }
    res.json(results);
  });
});

  router.post('/cart/remove', (req, res) => {
  const { uid, pid } = req.body;
  console.log('📥 Received remove request:', req.body);

  if (!uid || !pid) {
    return res.status(400).json({ error: 'กรุณาระบุ uid และ pid' });
  }

  pool.query(
    'DELETE FROM Cart WHERE uid = ? AND pid = ?',
    [uid, pid],
    (err, result) => {
      if (err) {
        console.error('❌ Error deleting cart item:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
      }
      console.log('✅ Rows affected:', result.affectedRows);
      res.json({ message: 'ลบสินค้าออกจากตะกร้าแล้ว' });
    }
  );
});
router.post('/cart/update', (req, res) => {
  const { uid, pid, amount } = req.body;

  if (!uid || !pid || amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: 'กรุณาระบุ uid, pid และ amount ที่ถูกต้อง' });
  }

  const amt = Number(amount);
  if (amt < 1) {
    // ลบสินค้าออกถ้าจำนวนต่ำกว่า 1
    pool.query(
      'DELETE FROM Cart WHERE uid = ? AND pid = ?',
      [uid, pid],
      (err, result) => {
        if (err) {
          console.error('❌ Error deleting cart item:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบสินค้า' });
        }
        res.json({ message: 'ลบสินค้าออกจากตะกร้าแล้ว' });
      }
    );
  } else {
    // อัปเดตจำนวนสินค้า
    pool.query(
      'UPDATE Cart SET amount = ? WHERE uid = ? AND pid = ?',
      [amt, uid, pid],
      (err, result) => {
        if (err) {
          console.error('❌ Error updating cart:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสินค้า' });
        }
        res.json({ message: 'อัปเดตจำนวนสินค้าในตะกร้าแล้ว', amount: amt });
      }
    );
  }
});

  return router;
}
