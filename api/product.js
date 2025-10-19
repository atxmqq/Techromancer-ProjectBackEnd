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
            p.picture_one,
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
                p.picture_one,
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


    // ✅ ดึงข้อมูลสินค้าพร้อมรายละเอียด
  router.get("/products/:pid", async (req, res) => {
    const { pid } = req.params;

    try {
      // --- ดึงข้อมูลหลักจาก Product ---
      const [productResults] = await pool.promise().query(
        `SELECT 
          p.*,
          pc.name AS category_name,
          pt.name AS type_name
        FROM Product p
        JOIN Product_Categories pc ON p.pc_id = pc.pc_id
        JOIN Product_Type pt ON p.pt_id = pt.pt_id
        WHERE p.pid = ?`,
        [pid]
      );

      if (productResults.length === 0) {
        return res.status(404).json({ error: "ไม่พบข้อมูลสินค้า" });
      }

      const product = productResults[0];

      // --- ตารางรายละเอียดที่สัมพันธ์กับ Product ---
      const detailMapping = [
        { field: "comset_details", table: "Product_Comset_details", key: "cs_id" },
        { field: "cpu_details", table: "Product_Cpu_details", key: "cpu_id" },
        { field: "ram_details", table: "Product_Ram_details", key: "ram_id" },
        { field: "vga_details", table: "Product_Vga_details", key: "vga_id" },
        { field: "mainboard_details", table: "Product_Mainboard_details", key: "mb_id" },
        { field: "storage_details", table: "Product_Storage_details", key: "st_id" },
        { field: "power_details", table: "Product_Power_details", key: "pw_id" },
        { field: "case_details", table: "Product_Case_details", key: "case_id" },
      ];

      let detailsData = {};
      let foundTables = [];

      // --- วนดูทุก field ---
      for (const { field, table, key } of detailMapping) {
        const relatedId = product[field]; // ดูว่ามี id ใน product ไหม
        if (!relatedId) continue; // ถ้าไม่มีให้ข้าม

        const [rows] = await pool
          .promise()
          .query(`SELECT * FROM ${table} WHERE ${key} = ?`, [relatedId]);

        if (rows.length > 0) {
          detailsData[table] = rows[0];
          foundTables.push(table);
        }
      }

      // --- ส่งข้อมูลกลับ ---
      return res.json({
        ...product,
        details_from: foundTables,
        details_data: detailsData,
      });

  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});





    return router;
}
