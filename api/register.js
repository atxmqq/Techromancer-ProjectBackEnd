import express from 'express';

const router = express.Router();

export default function (connection) {
  router.post('/register', async (req, res) => {
    const { email, password, phone, address, fullname } = req.body;

    // ตรวจสอบข้อมูลว่าครบมั้ย
    if (!email || !password || !phone || !address || !fullname) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
      // ตรวจสอบว่า email ซ้ำหรือยัง
      const [existing] = await connection.promise().query(
        'SELECT * FROM User WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email นี้ถูกใช้ไปแล้ว' });
      }

      // บันทึก password ลงฐานข้อมูลโดยไม่เข้ารหัส
      await connection.promise().query(
        'INSERT INTO User (email, password, phone, address, fullname) VALUES (?, ?, ?, ?, ?)',
        [email, password, phone, address, fullname]
      );

      res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
    }
  });

  return router;
}
