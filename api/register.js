import express from 'express';
import bcrypt from 'bcrypt';

export default function (pool) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, fullname, email, password, phone } = req.body;

    if (!username || !fullname || !email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      pool.query(
        'INSERT INTO User (username, fullname, email, password, phone) VALUES (?, ?, ?, ?, ?)',
        [username, fullname, email.trim(), hashedPassword, phone],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
          }
          res.json({ message: 'สมัครสมาชิกสำเร็จ' });
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการ hash รหัสผ่าน' });
    }
  });

  return router;
}
