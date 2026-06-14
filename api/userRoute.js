import express from 'express';
import bcrypt from 'bcrypt';
export default function (pool) {
    const router = express.Router();
    // ดึงผู้ใช้ทั้งหมด
    router.get('/users', (req, res) => {
        pool.query(
            'SELECT uid, email, username, fullname, phone, status FROM User',
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

    router.get('/users/:uid', (req, res) => {
        const { uid } = req.params;
        pool.query(
            'SELECT uid, email, username, fullname, phone, address, status FROM User WHERE uid = ?',
            [uid],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
                if (results.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
                res.json(results[0]);
            }
        );
    });

    router.put('/users/update-status/:uid', (req, res) => {
        const { uid } = req.params;
        const { status } = req.body;

        pool.query(
            'UPDATE User SET status = ? WHERE uid = ?',
            [status, uid],
            (err, results) => {
                if (err) {
                    console.error('Error updating user status:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
                }
                if (results.affectedRows === 0) {
                    return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
                }
                res.json({ message: 'อัปเดตสถานะผู้ใช้สำเร็จ' });
            }
        );
    });

    router.put('/users/:uid', (req, res) => {
        const { uid } = req.params;
        // ⭐️ เพิ่มการรับ oldPassword และ newPassword จากหน้าเว็บ
        const { fullname, phone, email, oldPassword, newPassword } = req.body;

        // ==========================================
        // กรณีที่ 1: เปลี่ยนรหัสผ่าน
        // ==========================================
        if (oldPassword && newPassword) {
            // 1. ดึงรหัสผ่านเดิมที่แฮชไว้ใน Database ออกมา
            pool.query(
                'SELECT password FROM User WHERE uid = ?',
                [uid],
                async (err, results) => {
                    if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
                    if (results.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });

                    const storedHashedPassword = results[0].password;

                    try {
                        // 2. เปรียบเทียบรหัสเก่าที่พิมพ์มา กับรหัสใน Database
                        const isMatch = await bcrypt.compare(oldPassword, storedHashedPassword);

                        if (!isMatch) {
                            // ถ้ารหัสเดิมผิด ให้เตะกลับไปเลย
                            return res.status(400).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
                        }

                        // 3. ถ้ารหัสเดิมถูก ให้ทำการ Hash รหัสผ่านใหม่ (Salt 10 รอบกำลังดี)
                        const saltRounds = 10;
                        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

                        // 4. บันทึกรหัสผ่านใหม่(ที่แฮชแล้ว) ลง Database
                        pool.query(
                            'UPDATE User SET password = ? WHERE uid = ?',
                            [hashedNewPassword, uid],
                            (updateErr) => {
                                if (updateErr) return res.status(500).json({ error: 'เปลี่ยนรหัสผ่านล้มเหลว' });
                                return res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
                            }
                        );
                    } catch (bcryptErr) {
                        console.error('Bcrypt Error:', bcryptErr);
                        return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้ารหัส' });
                    }
                }
            );
            return; // จบการทำงาน ไม่ต้องไปทำส่วนอัปเดตข้อมูลส่วนตัวด้านล่าง
        }

        // ==========================================
        // กรณีที่ 2: อัปเดตข้อมูลส่วนตัวทั่วไป (เมื่อไม่ได้ส่งรหัสผ่านมา)
        // ==========================================
        pool.query(
            'SELECT uid FROM User WHERE (email = ? OR phone = ?) AND uid != ?',
            [email, phone, uid],
            (checkErr, checkResults) => {
                if (checkErr) {
                    console.error('Error checking duplicates:', checkErr);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
                }

                // 2. ถ้า Query เจอ แปลว่ามีคนใช้อีเมลหรือเบอร์นี้ไปแล้ว
                if (checkResults.length > 0) {
                    return res.status(400).json({ error: 'อีเมลหรือหมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว' });
                }

                // 3. ถ้าไม่ซ้ำ ก็ทำการอัปเดตตามปกติ
                pool.query(
                    'UPDATE User SET fullname = ?, phone = ?, email = ? WHERE uid = ?',
                    [fullname, phone, email, uid],
                    (err) => {
                        if (err) {
                            console.error('Error updating profile:', err);
                            return res.status(500).json({ error: 'อัปเดตล้มเหลว email ซ้ำ' });
                        }
                        res.json({ message: 'อัปเดตสำเร็จ' });
                    }
                );
            }
        );
    });
    // 1. ดึงข้อความแจ้งเตือนของสมาชิก
router.get('/notifications/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const [rows] = await pool.promise().query(
            'SELECT * FROM Notification WHERE uid = ? ORDER BY created_at DESC LIMIT 30',
            [uid]
        );
        res.json(rows);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแจ้งเตือนได้' });
    }
});

// 2. อัปเดตสถานะว่า "อ่านแล้ว" ทั้งหมด เมื่อกดเปิดกระดิ่ง
router.put('/notifications/read/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        await pool.promise().query(
            'UPDATE Notification SET is_read = TRUE WHERE uid = ? AND is_read = FALSE',
            [uid]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error updating notifications:", err);
        res.status(500).json({ error: 'ไม่สามารถอัปเดตสถานะได้' });
    }
});

    return router;

}
