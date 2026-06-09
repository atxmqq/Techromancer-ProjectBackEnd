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

                // 2. ถ้าเจอข้อมูล ให้เช็คทีละตัวแบบครอบคลุม (เปลี่ยนเป็นตัวเล็กทั้งหมดก่อนเทียบ)
                if (results.length > 0) {
                    let isUsernameExist = false;
                    let isEmailExist = false;
                    let isPhoneExist = false;

                    // วนลูปเช็คทุกแถวที่หาเจอ ป้องกันกรณีที่เจอหลาย record
                    for (let row of results) {
                        if (row.username.toLowerCase() === username.toLowerCase()) isUsernameExist = true;
                        if (row.email.toLowerCase() === email.toLowerCase()) isEmailExist = true;
                        if (row.phone === phone) isPhoneExist = true;
                    }

                    // แจ้งเตือนตามสิ่งที่ซ้ำ (เรียงลำดับความสำคัญ)
                    if (isUsernameExist) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ (Username) ถูกใช้งานแล้ว กรุณาใช้ชื่ออื่น' });
                    if (isEmailExist) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
                    if (isPhoneExist) return res.status(400).json({ error: 'หมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว' });
                }

                // 3. ถ้าไม่มีอะไรซ้ำเลย ให้ทำการแฮชรหัสผ่าน แล้วบันทึกข้อมูล
                const hashedPassword = await bcrypt.hash(password, 10);

                pool.query(
                    'INSERT INTO User (username, fullname, email, password, phone) VALUES (?, ?, ?, ?, ?)',
                    [username, fullname, email, hashedPassword, phone],
                    (insertErr) => {
                        if (insertErr) {
                            console.error('Insert Error:', insertErr);
                            return res.status(500).json({ error: 'สมัครสมาชิกไม่สำเร็จ' });
                        }
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
