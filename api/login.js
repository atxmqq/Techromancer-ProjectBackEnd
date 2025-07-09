import express from 'express';

const router = express.Router();

export default function (connection) {
  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'กรุณาระบุ email และ password' });

    connection.query(
      'SELECT * FROM User WHERE email = ?',
      [email],
      (err, results) => {
        if (err) {
          console.error('Error finding user:', err);
          return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
        }

        if (results.length === 0)
          return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });

        const user = results[0];

        // 🔴 ตรวจรหัสผ่านแบบตรง ๆ
        if (password !== user.password) {
          return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        res.json({
          message: 'เข้าสู่ระบบสำเร็จ',
          user: {
            uid: user.uid,
            email: user.email,
            fullname: user.fullname,
            // ⚠️ หากจำเป็นต้องส่ง password ไปจริง ๆ (เช่นเพื่อ debug) ให้ใส่ตรงนี้
            // password: user.password
          },
        });
      }
    );
  });

  // Route ดึงผู้ใช้ทั้งหมด
  router.get('/users', (req, res) => {
    connection.query('SELECT uid, email, fullname FROM User', (err, results) => {
      if (err) {
        console.error('❌ Error fetching users:', err);
        return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
      }
      res.json(results);
    });
  });

  return router;
}