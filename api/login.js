

import express from 'express';

const router = express.Router();

export default function (pool) {
  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณาระบุ email และ password' });
    }

    pool.query('SELECT * FROM User WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('Error finding user:', err);
        return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
      }

      const user = results[0];

      if (password !== user.password) {
        return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
      }

      return res.json({
        message: 'เข้าสู่ระบบสำเร็จ',
        user: {
          uid: user.uid,
          email: user.email,
          fullname: user.fullname,
        },
      });
    });
  });

  return router;
}