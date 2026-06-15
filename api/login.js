import express from 'express';
import bcrypt from 'bcrypt'; // ✅ ต้อง import bcrypt

export default function (pool) {
  const router = express.Router();

  // ==========================================
  // สำหรับสมาชิกทั่วไป (User)
  // ==========================================
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

        // ⭐️ สเต็ปที่ 1: ดักจับสถานะ Ban ตรงนี้เลย (ทำก่อนเช็ครหัสผ่าน)
        if (user.status === 'Ban') {
          return res.status(403).json({ error: 'บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อแอดมิน' });
        }

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


  // ==========================================
  // สำหรับพนักงานและแอดมิน (Employee)
  // ==========================================
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

        // ⭐️ ดักจับสถานะพนักงานที่โดนไล่ออก (Terminated) ไม่ให้เข้าหลังบ้านได้
        if (employee.status === 'Terminated') {
          return res.status(403).json({ error: 'บัญชีนี้ถูกยกเลิกการใช้งานแล้ว ไม่สามารถเข้าสู่ระบบได้' });
        }

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
  router.get('/user/check-status/:uid', async (req, res) => {
    const { uid } = req.params;
    
    if (!uid) return res.status(400).json({ error: 'ไม่พบ UID' });

    pool.query(
      'SELECT status FROM User WHERE uid = ?',
      [uid],
      (err, results) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (results.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });

        // ส่งสถานะปัจจุบันกลับไปให้หน้าเว็บ
        res.json({ status: results[0].status });
      }
    );
  });

  return router;
}