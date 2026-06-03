import express from 'express';
import bcrypt from 'bcrypt'; // ✅ ต้อง import bcrypt

export default function (pool) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณาระบุ email และ password' });
    }

    pool.query(
      'SELECT * FROM User WHERE email = ?',
      [email.trim()],
      async (err, results) => {
        if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });

        if (results.length === 0) {
          return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        const user = results[0];

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        res.json({
          message: 'เข้าสู่ระบบสำเร็จ',
          user: {
            uid: user.uid,
            email: user.email,
            fullname: user.fullname,
            phone: user.phone,
          },
          token: 'dummy_token'
        });
      }
    );
  });

router.post('/loginemployee', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณาระบุ email และ password' });
    }

    pool.query(
      'SELECT * FROM Employee WHERE email = ?',
      [email.trim()],
      async (err, results) => {
        if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });

        if (results.length === 0) {
          return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        const employee = results[0];
        let passwordMatch = false;

        // 👇 เช็คประเภทพนักงาน ถ้าเป็น Admin ให้เทียบรหัสผ่านตรงๆ ถ้าไม่ใช่ให้เทียบด้วย bcrypt
        if (employee.type === 'Admin') {
          passwordMatch = (password === employee.password); 
        } else {
          passwordMatch = await bcrypt.compare(password, employee.password); 
        }

        if (!passwordMatch) {
          return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
        }

        res.json({
          message: 'เข้าสู่ระบบสำเร็จ',
          employee: {
            eid: employee.eid,
            email: employee.email,
            fullname: employee.fullname,
            phone: employee.phone,
            type: employee.type,
          },
          token: 'dummy_token'
        });
      }
    );
  });


  return router;
}
