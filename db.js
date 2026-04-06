import mysql from 'mysql2';

const pool = mysql.createPool({
  host: 'mysqladmin.comsciproject.net', //191.101.230.103
  user: 'u528477660_techromancer',
  password: 'w^4O9}Zd',
  database: 'u528477660_techromancer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;