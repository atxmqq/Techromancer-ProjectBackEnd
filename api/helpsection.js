import express from 'express';

export default function (pool) {
    const router = express.Router();

    // ดึงข้อมูลทั้งหมด
    router.get('/helpsection', (req, res) => {
        const sqlQuery = `
            SELECT h.hid, h.question, h.answer, h.date_updated, h.eid, e.username 
            FROM Help_Section h
            LEFT JOIN Employee e ON h.eid = e.eid
            ORDER BY h.hid DESC
        `;

        pool.query(sqlQuery, (err, results) => {
            if (err) {
                console.error('Error finding help:', err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
            }
            res.json(results);
        });
    });

    // เพิ่มข้อมูลคำถามใหม่
    router.post('/helpsection', (req, res) => {
        const { question, answer, eid } = req.body;
        pool.query(
            'INSERT INTO Help_Section (question, answer, date_updated, eid) VALUES (?, ?, NOW(), ?)',
            [question, answer, eid],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'ไม่สามารถเพิ่มข้อมูลได้' });
                res.json({ message: 'เพิ่มข้อมูลสำเร็จ' });
            }
        );
    });

    // แก้ไขข้อมูลคำถาม
    router.put('/helpsection/:hid', (req, res) => {
        const { hid } = req.params;
        const { question, answer, eid } = req.body;
        pool.query(
            'UPDATE Help_Section SET question = ?, answer = ?, date_updated = NOW(), eid = ? WHERE hid = ?',
            [question, answer, eid, hid],
            (err) => {
                if (err) return res.status(500).json({ error: 'ไม่สามารถแก้ไขข้อมูลได้' });
                res.json({ message: 'แก้ไขข้อมูลสำเร็จ' });
            }
        );
    });

    
    router.delete('/helpsection/:hid', (req, res) => {
        const { hid } = req.params;

        pool.query(
            'DELETE FROM Help_Section WHERE hid = ?',
            [hid],
            (err, results) => {
                if (err) {
                    console.error('Error deleting help:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
                }

                if (results.affectedRows === 0) {
                    return res.status(404).json({ error: 'ไม่พบข้อมูลคำถามที่ต้องการลบ' });
                }

                res.json({ message: 'ลบข้อมูลสำเร็จ' });
            }
        );
    });
    router.get('/help', async (req, res) => {
    try {
      // ดึงคำถาม คำตอบ และวันที่อัปเดต (เรียงจากอัปเดตล่าสุดไปเก่าสุด)
      const [results] = await pool.promise().query(
        'SELECT question, answer, date_updated FROM Help_Section ORDER BY date_updated DESC'
      );
      
      res.json({ success: true, data: results });
    } catch (error) {
      console.error('Error fetching help section:', error);
      res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลช่วยเหลือได้' });
    }
  });
    return router;
}