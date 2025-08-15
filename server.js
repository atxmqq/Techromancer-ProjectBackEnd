// server.js
import express from 'express';
import cors from 'cors';
import { createPool } from 'mysql2';
import loginRoute from './api/login.js';
import register from './api/register.js';
import userRoute from './api/userRoute.js';
import productRoute from './api/product.js';
import cartRoute from './api/cartRoute.js';
import address from './api/address.js';
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// เปลี่ยนจาก createConnection เป็น createPool
const pool = createPool({
  host: '191.101.230.103',
  user: 'u528477660_techromancer',
  password: 'w^4O9}Zd',
  database: 'u528477660_techromancer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log('✅ Connected to database (via pool)');

// ส่ง pool แทน connection
app.use('/api', loginRoute(pool));
app.use('/api', register(pool));
app.use('/api', userRoute(pool));
app.use('/api', productRoute(pool));
app.use('/api', cartRoute(pool));
app.use('/api', address(pool));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
