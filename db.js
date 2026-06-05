import mysql from 'mysql2';

const pool = mysql.createPool({
  // host: 'mysqladmin.comsciproject.net', //191.101.230.103
  // user: 'u528477660_techromancer',
  // password: 'w^4O9}Zd',
  // database: 'u528477660_techromancer',
  host: process.env.DB_HOST,         // ดึงค่าจากช่อง DB_HOST ที่คุณกรอก
  user: process.env.DB_USER,         // ดึงค่าจากช่อง DB_USER
  password: process.env.DB_PASSWORD, // ดึงค่าจากช่อง DB_PASSWORD
  database: process.env.DB_NAME,      // ดึงค่าจากช่อง DB_NAME
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;