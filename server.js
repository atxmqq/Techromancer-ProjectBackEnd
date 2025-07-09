// server.js
import express from 'express';
import cors from 'cors';
import { createConnection } from 'mysql2';
import loginRoute from './api/login.js'; 

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// เชื่อมต่อ MySQL
const connection = createConnection({
  host: '191.101.230.103',
  user: 'u528477660_techromancer',
  password: 'w^4O9}Zd',
  database: 'u528477660_techromancer',
});

connection.connect(err => {
  if (err) {
    console.error('❌ DB connection failed:', err);
  } else {
    console.log('✅ Connected to database');
  }
});

// ใช้ API Login
app.use('/api', loginRoute(connection));

// ตัวอย่าง API เดิม
app.get('/products', (req, res) => {
  connection.query('SELECT * FROM products', (err, results) => {
    if (err) {
      res.status(500).send('Error fetching products');
    } else {
      res.json(results);
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
