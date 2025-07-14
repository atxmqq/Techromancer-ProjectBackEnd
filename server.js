// server.js
import express from 'express';
import cors from 'cors';
<<<<<<< HEAD
import loginRoute from './api/login.js';
import db from './db.js'; // นำเข้า pool จาก db.js
=======
import { createConnection } from 'mysql2';
import loginRoute from './api/login.js'; 
import registerRoute from './api/register.js';
>>>>>>> 814ef32b0100f8a2e9da5531132080ac12223832

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// ✅ ใช้ Pool กับ API
app.use('/api', loginRoute(db));

<<<<<<< HEAD
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
=======
connection.connect(err => {
  if (err) {
    console.error('❌ DB connection failed:', err);
  } else {
    console.log('✅ Connected to database');
  }
});

// ใช้ API Login
app.use('/api', loginRoute(connection));
app.use('/api', registerRoute(connection));


>>>>>>> 814ef32b0100f8a2e9da5531132080ac12223832

// ✅ เริ่มต้น server
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
