// api/cartRoute.js
import express from 'express';

export default function (pool) {
  const router = express.Router();

  // เพิ่มสินค้าลงตะกร้า
  router.post('/cart/add', (req, res) => {
    const { uid, pid, amount } = req.body;

    if (!uid || !pid || !amount) {
      return res.status(400).json({ error: 'กรุณาระบุ uid, pid และ amount' });
    }

    // เช็คว่ามีสินค้านี้ในตะกร้าแล้วหรือไม่
    pool.query(
      'SELECT * FROM Cart WHERE uid = ? AND pid = ?',
      [uid, pid],
      (err, results) => {
        if (err) {
          console.error('❌ Error checking cart:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
        }

        if (results.length > 0) {
          // อัปเดตจำนวน
          pool.query(
            'UPDATE Cart SET amount = amount + ? WHERE uid = ? AND pid = ?',
            [amount, uid, pid],
            (err2) => {
              if (err2) {
                console.error('❌ Error updating cart:', err2);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดต' });
              }
              res.json({ message: 'อัปเดตจำนวนสินค้าในตะกร้าแล้ว' });
            }
          );
        } else {
          // เพิ่มแถวใหม่
          pool.query(
            'INSERT INTO Cart (uid, pid, amount) VALUES (?, ?, ?)',
            [uid, pid, amount],
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
      SELECT c.pid, c.amount, p.name, p.price_before, p.picture
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

  // ✅ ลบสินค้าออกจากตะกร้า
  router.post('/cart/remove', (req, res) => {
    const { uid, pid } = req.body;

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
        res.json({ message: 'ลบสินค้าออกจากตะกร้าแล้ว' });
      }
    );
  });

  return router;
}
