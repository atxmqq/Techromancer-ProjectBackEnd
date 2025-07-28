import express from 'express';

export default function (pool) {
    const router = express.Router();
    // ดึงผู้ใช้ทั้งหมด
    router.get('/users', (req, res) => {
        pool.query(
            'SELECT uid, email, username, fullname, phone FROM User',
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
            'SELECT uid, email, username, fullname, phone FROM User WHERE uid = ?',
            [uid],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
                if (results.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
                res.json(results[0]);
            }
        );
    });

    router.put('/users/:uid', (req, res) => {
        const { uid } = req.params;
        const { name, phone, email } = req.body;

        pool.query(
            'UPDATE User SET username = ?, phone = ?, email = ? WHERE uid = ?',
            [name, phone, email, uid],
            (err) => {
                if (err) return res.status(500).json({ error: 'อัปเดตล้มเหลว' });
                res.json({ message: 'อัปเดตสำเร็จ' });
            }
        );
    });

    return router;

}
