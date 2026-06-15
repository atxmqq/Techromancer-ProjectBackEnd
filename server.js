import express from 'express';
import cors from 'cors';
import pool from './db.js';
import cron from 'node-cron';

import loginRoute from './api/login.js';
import register from './api/register.js';
import userRoute from './api/userRoute.js';
import productRoute from './api/product.js';
import cartRoute from './api/cartRoute.js';
import addressRouter from './api/address.js';
import orderRoute from './api/order.js';
import custompcRoute from './api/custompc.js';
import employee from './api/employee.js';
import storeInfoRouter from './api/storeinfo.js';
import helpsection from './api/helpsection.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

console.log('✅ Database pool is ready to use');

app.use('/api', loginRoute(pool));
app.use('/api', register(pool));
app.use('/api', userRoute(pool));
app.use('/api', productRoute(pool));
app.use('/api', cartRoute(pool));
app.use('/api/address', addressRouter(pool));
app.use('/api', orderRoute(pool));
app.use('/uploads', express.static('uploads'));
app.use('/api', custompcRoute(pool));
app.use('/api', employee(pool));
app.use('/uploadsEmployeeProfile', express.static(path.join(__dirname, 'uploadsEmployeeProfile')));
app.use('/api', storeInfoRouter(pool));
app.use('/api', helpsection(pool));


cron.schedule('0 0 * * *', async () => {
  console.log('เริ่มตรวจสอบออเดอร์ที่จัดส่งเกิน 7 วัน...');

  try {
    // คำสั่ง SQL: ค้นหาออเดอร์ที่สถานะเป็น 'อยู่ระหว่างจัดส่ง' 
    // และวันที่สั่งซื้อ (order_date) ผ่านมาแล้ว 7 วันขึ้นไป
    const sql = `
      UPDATE \`Order\` 
      SET status = 'จัดส่งสำเร็จ' 
      WHERE status = 'อยู่ระหว่างจัดส่ง' 
      AND DATEDIFF(NOW(), order_date) >= 7
    `;

    // สั่งรัน SQL (ต้องมั่นใจว่าในไฟล์นี้คุณดึงตัวแปร pool มาใช้งานแล้ว)
    const [result] = await pool.promise().query(sql);

    if (result.affectedRows > 0) {
      console.log(`อัปเดตสถานะเป็น 'จัดส่งสำเร็จ' อัตโนมัติจำนวน ${result.affectedRows} ออเดอร์`);
    } else {
      console.log('ไม่มีออเดอร์ที่ต้องอัปเดตสถานะในวันนี้');
    }

  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});