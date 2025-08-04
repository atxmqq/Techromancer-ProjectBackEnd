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


    // อันนี้ยังเหมือนเดิมไว้ใช้กรณีอยากได้เฉพาะ categories
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

    return router;
}
