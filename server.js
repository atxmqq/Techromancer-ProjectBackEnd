import express from 'express';
import cors from 'cors';

// Import pool จากไฟล์ db.js ที่เราสร้างไว้
import pool from './db.js';

import loginRoute from './api/login.js';
import register from './api/register.js';
import userRoute from './api/userRoute.js';
import productRoute from './api/product.js';
import cartRoute from './api/cartRoute.js';
import addressRouter from './api/address.js';
import paymentRoutes from './api/payment.js';
import orderRoute from './api/order.js';
import custompcRoute from './api/custompc.js';
import employee from './api/employee.js';
import storeInfoRouter from './api/storeinfo.js';
import helpsection from './api/helpsection.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log('✅ Database pool is ready to use');

console.log('✅ Database pool is ready to use');

// ส่ง pool ที่ดึงมา เข้าไปใน Route ต่างๆ
app.use('/api', loginRoute(pool));
app.use('/api', register(pool));
app.use('/api', userRoute(pool));
app.use('/api', productRoute(pool));
app.use('/api', cartRoute(pool));
app.use('/api/address', addressRouter(pool));
app.use('/api', paymentRoutes); // อันนี้ไม่ได้ส่ง pool ไป (อิงตามโค้ดเดิมของคุณ)
app.use('/api', orderRoute(pool));
app.use('/uploads', express.static('uploads'));
app.use('/api', custompcRoute(pool));
app.use('/api', employee(pool));
app.use('/uploadsEmployeeProfile', express.static('uploadsEmployeeProfile'));
app.use('/api', storeInfoRouter(pool));
app.use('/api', helpsection(pool));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});