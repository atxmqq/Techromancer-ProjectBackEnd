import express from 'express';
import bcrypt from 'bcrypt';

export default function (pool) {
    const router = express.Router();

    router.get('/employee', (req, res) => {
        pool.query(
            'SELECT eid, email, username, fullname, phone, type, status FROM Employee',
            (err, results) => {
                if (err) {
                    console.error('Error finding user:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
                }
                // ส่งผลลัพธ์กลับไปยัง client
                res.json(results);
            }
        );
    });

    router.get('/employee/:eid', (req, res) => {
        const { eid } = req.params;
        pool.query(
            'SELECT eid, email, username, fullname, phone, type, status FROM Employee WHERE eid = ?',
            [eid],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
                if (results.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
                res.json(results[0]);
            }
        );
    });

    
    router.post('/employeereg', async (req, res) => {
        const { username, fullname, email, password, phone } = req.body; // ลบ type ออกเพราะเราฟิกค่าไว้ใน SQL แล้ว

        try {
            // 1. เช็คตาราง Employee และต้องใส่คำว่า WHERE
            pool.query(
                'SELECT username, email, phone FROM Employee WHERE username = ? OR email = ? OR phone = ?',
                [username, email, phone],
                async (err, results) => {
                    if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });

                    // 2. ถ้าเจอข้อมูล แปลว่ามีอะไรสักอย่างซ้ำ
                    if (results.length > 0) {
                        const existingUser = results[0];
                        if (existingUser.username === username) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ (Username) ถูกใช้งานแล้ว' });
                        if (existingUser.email === email) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
                        if (existingUser.phone === phone) return res.status(400).json({ error: 'หมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว' });
                    }

                    // 3. แฮชรหัสผ่าน แล้วบันทึกข้อมูลลงตาราง Employee (ไม่ใช่ตาราง User)
                    const hashedPassword = await bcrypt.hash(password, 10);

                    pool.query(
                        'INSERT INTO Employee (username, fullname, email, password, phone, type) VALUES (?, ?, ?, ?, ?, ?)',
                        [username, fullname, email, hashedPassword, phone, 'Employee'],
                        (insertErr) => {
                            if (insertErr) {
                                console.error('Insert Error:', insertErr);
                                return res.status(500).json({ error: 'เพิ่มพนักงานไม่สำเร็จ' });
                            }
                            return res.status(200).json({ message: 'เพิ่มพนักงานสำเร็จ!' });
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