// server.js
import express from 'express';
import cors from 'cors';
import loginRoute from './api/login.js';
import db from './db.js'; // นำเข้า pool จาก db.js

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// ✅ ใช้ Pool กับ API
app.use('/api', loginRoute(db));

// ✅ ตัวอย่าง API products
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) {
      console.error('❌ Error fetching products:', err);
      return res.status(500).send('เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า');
    }
    res.json(results);
  });
});

// ✅ เริ่มต้น server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
