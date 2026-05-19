import bcrypt from 'bcrypt';
import express from 'express';

export default function (pool) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, fullname, email, password, phone } = req.body;

    try {
        // 1. เช็คก่อนว่ามี username, email หรือ phone นี้ใน Database หรือยัง
        pool.query(
            'SELECT username, email, phone FROM User WHERE username = ? OR email = ? OR phone = ?',
            [username, email, phone],
            async (err, results) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });

                // 2. ถ้าเจอข้อมูล แปลว่ามีอะไรสักอย่างซ้ำ
                if (results.length > 0) {
                    const existingUser = results[0];
                    
                    if (existingUser.username === username) {
                        return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ (Username) ถูกใช้งานแล้ว' });
                    }
                    if (existingUser.email === email) {
                        return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
                    }
                    if (existingUser.phone === phone) {
                        return res.status(400).json({ error: 'หมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว' });
                    }
                }

                // 3. ถ้าไม่มีอะไรซ้ำเลย ให้ทำการแฮชรหัสผ่าน แล้วบันทึกข้อมูล
                const hashedPassword = await bcrypt.hash(password, 10);

                pool.query(
                    'INSERT INTO User (username, fullname, email, password, phone) VALUES (?, ?, ?, ?, ?)',
                    [username, fullname, email, hashedPassword, phone],
                    (insertErr) => {
                        if (insertErr) return res.status(500).json({ error: 'สมัครสมาชิกไม่สำเร็จ' });
                        
                        return res.status(200).json({ message: 'สมัครสมาชิกสำเร็จ!' });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์' });
    }
});

  return router;
}
