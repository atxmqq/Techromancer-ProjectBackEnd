// server.js
import express from 'express';
import cors from 'cors';
import { createConnection } from 'mysql2';
import loginRoute from './api/login.js'; 
import registerRoute from './api/register.js';

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
app.use('/api', registerRoute(connection));



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
