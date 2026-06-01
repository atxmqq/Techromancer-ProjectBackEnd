import express from 'express';
import bcrypt from 'bcrypt'; // ✅ ต้อง import bcrypt

export default function (pool) {
  const router = express.Router();

  // login.js
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณาระบุ email และ password' });
  }

  // 1. ค้นหาในตาราง User ก่อน
  pool.query('SELECT * FROM User WHERE email = ?', [email.trim()], async (err, users) => {
    if (err) return res.status(500).json({ error: 'Server Error' });

    if (users.length > 0) {
      const user = users[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });

      return res.json({
        message: 'เข้าสู่ระบบสำเร็จ',
        role: 'user',
        data: { id: user.uid, email: user.email, name: user.fullname }, // ส่ง id กลับมา
        token: 'dummy_token'
      });
    }

    // 2. ถ้าไม่เจอในตาราง User ให้ค้นหาในตาราง Employee
    pool.query('SELECT * FROM Employee WHERE email = ?', [email.trim()], async (err, emps) => {
      if (err) return res.status(500).json({ error: 'Server Error' });

      if (emps.length > 0) {
        const emp = emps[0];
        // เช็ค Password (ถ้าเป็น Plain text ให้เช็คตรงๆ หรือใช้ bcrypt ตามที่ตั้งค่าไว้)
        if (password !== emp.password) return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });

        return res.json({
          message: 'เข้าสู่ระบบสำเร็จ',
          role: 'employee',
          data: { id: emp.eid, email: emp.email, name: emp.fullname }, // ส่ง id กลับมา
          token: 'dummy_token'
        });
      }

      return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
    });
  });
});


  return router;
}
