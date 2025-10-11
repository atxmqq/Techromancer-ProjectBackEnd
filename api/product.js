import express from 'express';

export default function (pool) {
    const router = express.Router();

    // ดึง product พร้อม join categories และ type
    router.get('/products', (req, res) => {
        pool.query(
            `SELECT 
            p.pid,
            p.name,
            p.details,
            p.price_before,
            p.picture,
            p.amount,
            p.pc_id,
            p.pt_id,
            pc.name AS category_name,
            pt.name AS type_name
        FROM Product p
        JOIN Product_Categories pc ON p.pc_id = pc.pc_id
        JOIN Product_Type pt ON p.pt_id = pt.pt_id`,
            (err, results) => {
                if (err) {
                    console.error('Error finding product:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
                }
                res.json(results);
            }
        );
    });


    router.get('/products/search', (req, res) => {
        const { q } = req.query; // รับค่า search query จาก URL (เช่น /products/search?q=...)

        if (!q) {
            return res.status(400).json({ error: 'กรุณาระบุคำค้นหา (q)' });
        }

        const searchTerm = `%${q}%`; // เพิ่ม % เพื่อให้ SQL LIKE ทำงานได้ถูกต้อง

        pool.query(
            `SELECT 
                p.pid,
                p.name,
                p.details,
                p.price_before,
                p.picture,
                p.amount,
                pc.name AS category_name,
                pt.name AS type_name
            FROM Product p
            JOIN Product_Categories pc ON p.pc_id = pc.pc_id
            JOIN Product_Type pt ON p.pt_id = pt.pt_id
            WHERE p.name LIKE ? OR p.details LIKE ?`,
            [searchTerm, searchTerm], // ส่งค่า searchTerm ไปให้ SQL query
            (err, results) => {
                if (err) {
                    console.error('Error searching products:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล' });
                }
                if (results.length === 0) {
                    return res.status(404).json({ message: 'ไม่พบสินค้าที่ตรงกับคำค้นหา' });
                }
                res.json(results);
            }
        );
    });


    router.get('/products/product_Categories', (req, res) => {
        pool.query(
            'SELECT * FROM Product_Categories',
            (err, results) => {
                if (err) {
                    console.error('Error finding product_categories:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
                }
                res.json(results);
            }
        );
    });


    router.get('/products/product_Type', (req, res) => {
        pool.query(
            'SELECT * FROM Product_Type',
            (err, results) => {
                if (err) {
                    console.error('Error finding product_type:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
                }
                res.json(results);
            }
        );
    });


    router.get('/products/:pid', (req, res) => {
        const { pid } = req.params;
        pool.query(
            `SELECT 
      p.pid,
      p.name,
      p.details,
      p.price_before,
      p.picture,
      p.amount,
      p.pc_id,
      p.pt_id,
      pc.name AS category_name,
      pt.name AS type_name
    FROM Product p
    JOIN Product_Categories pc ON p.pc_id = pc.pc_id
    JOIN Product_Type pt ON p.pt_id = pt.pt_id
    WHERE p.pid = ?`,
            [pid],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
                if (results.length === 0) return res.status(404).json({ error: 'ไม่พบข้อมูลสินค้า' });
                res.json(results[0]);
            }
        );
    });




    return router;
}
