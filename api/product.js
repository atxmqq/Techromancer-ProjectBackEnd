import express from 'express';

export default function (pool) {
    const router = express.Router();

    // ดึง product พร้อม join categories และ type
    router.get("/products", async (req, res) => {
        try {
            const query = `
      SELECT 
        p.pid, 
        p.pc_id, 
        p.name, 
        p.price,          
        p.amount,         
        p.details,        
        p.price_before, 
        p.picture_one,

        cpu.Brand AS cpu_brand,
        cpu.Series AS cpu_series,
        cpu.Processor_Number AS cpu_processor, 
        cpu.Socket_Type AS cpu_socket,

        vga.Brands AS vga_brand,
        vga.GPU_Series AS vga_series,
        vga.GPU_Model AS vga_model,
        vga.Memory_Size AS vga_memory,
        vga.Power_Requirement AS vga_power,

        ram.Brand AS ram_brand,
        ram.Memory_Series AS ram_series,
        ram.Memory_Capacity AS ram_capacity,
        ram.Speed AS ram_speed,
        ram.Memory_Type AS ram_type,
        
        -- 1. เช็ค CPU ↔ เมนบอร์ด (จับคู่ Socket)
        COALESCE(cpu.Socket_Type, mb.CPU_Socket) AS socket_type,
        
        -- 2. เช็ค RAM ↔ เมนบอร์ด (จับคู่ประเภทแรม)
        COALESCE(ram.Memory_Type, mb.Memory_Type) AS ram_type,
        
        -- 3. เช็ค การ์ดจอ ↔ พาวเวอร์ซัพพลาย (คำนวณกำลังวัตต์)
        vga.Power_Requirement AS recommended_psu,
        pw.Continuous_Power_W AS wattage,

        -- 4. เช็ค เมนบอร์ด ↔ เคส (จับคู่ขนาดบอร์ด)
        mb.Form_Factor AS mobo_form_factor,
        c.Mainboard_Support AS case_mobo_support

      FROM Product p
      LEFT JOIN Product_Cpu_details cpu ON p.cpu_details = cpu.cpu_id
      LEFT JOIN Product_Mainboard_details mb ON p.mainboard_details = mb.mb_id
      LEFT JOIN Product_Ram_details ram ON p.ram_details = ram.ram_id
      LEFT JOIN Product_Vga_details vga ON p.vga_details = vga.vga_id
      LEFT JOIN Product_Power_details pw ON p.power_details = pw.pw_id
      LEFT JOIN Product_Case_details c ON p.case_details = c.case_id
    `;

            const [results] = await pool.promise().query(query);
            res.json(results);

        } catch (err) {
            console.error('Error fetching all products:', err);
            res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
        }
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
    // --- โค้ดสำหรับระบบกดถูกใจ (Like) ---
    router.post('/like', (req, res) => {
        const { uid, pid } = req.body;

        if (!uid || !pid) {
            return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
        }

        // 1. ตรวจสอบก่อนว่าเคยไลก์ไปหรือยัง
        const checkSql = "SELECT * FROM Like_product WHERE uid = ? AND pid = ?";
        pool.query(checkSql, [uid, pid], (err, result) => {
            if (err) {
                console.error("Error checking like:", err);
                return res.status(500).json({ error: err });
            }

            if (result.length > 0) {
                return res.status(400).json({ message: "คุณถูกใจสินค้านี้ไปแล้ว" });
            }

            // 2. ถ้ายังไม่เคยไลก์ ให้ Insert ข้อมูล
            const sql = "INSERT INTO Like_product (uid, pid) VALUES (?, ?)";
            pool.query(sql, [uid, pid], (err, result) => {
                if (err) {
                    console.error("Error inserting like:", err);
                    return res.status(500).json({ error: err });
                }
                return res.status(200).json({ message: "ถูกใจสำเร็จ!" });
            });
        });
    });
    // 1. ตรวจสอบว่า User ไลค์สินค้าตัวนี้หรือยัง (สำหรับตอนโหลดหน้า)
    router.get('/like/check/:uid/:pid', (req, res) => {
        const { uid, pid } = req.params;
        pool.query("SELECT * FROM Like_product WHERE uid = ? AND pid = ?", [uid, pid], (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json({ liked: results.length > 0 });
        });
    });

    // 2. ยกเลิกการถูกใจ (Delete)
    router.delete('/like', (req, res) => {
        const { uid, pid } = req.body;
        pool.query("DELETE FROM Like_product WHERE uid = ? AND pid = ?", [uid, pid], (err, result) => {
            if (err) return res.status(500).json({ error: err });
            res.status(200).json({ message: "ยกเลิกถูกใจสำเร็จ" });
        });
    });
    router.get('/likes/:uid', (req, res) => {
        const { uid } = req.params;
        const sql = `
        SELECT p.pid, p.name, p.price_before, p.picture_one 
        FROM Like_product l 
        JOIN Product p ON l.pid = p.pid 
        WHERE l.uid = ?
    `;
        pool.query(sql, [uid], (err, results) => {
            if (err) return res.status(500).json({ error: err });
            res.json(results);
        });
    });



    // --- API สำหรับเพิ่มสินค้าใหม่ (POST) ---
    router.post("/products", async (req, res) => {
        const db = pool.promise();
        const {
            name, details, price, price_before, amount,
            picture_one, picture_two, picture_three, picture_four, picture_five,
            pc_id, pt_id, specificDetails
        } = req.body;

        try {
            // เช็คชื่อซ้ำ
            const [existingProduct] = await db.query('SELECT pid FROM Product WHERE name = ?', [name.trim()]);
            if (existingProduct.length > 0) {
                return res.status(400).json({ error: "มีชื่อสินค้านี้ในระบบแล้ว กรุณาตั้งชื่ออื่น" });
            }

            await db.query('BEGIN'); // เริ่ม Transaction

            // Mapping: หมวดหมู่ไหน ไปลงตารางไหน และผูกกับคอลัมน์ไหนใน Product
            const detailMapping = {
                "1": { col: "cpu_details", table: "Product_Cpu_details" },
                "2": { col: "ram_details", table: "Product_Ram_details" },
                "3": { col: "mainboard_details", table: "Product_Mainboard_details" },
                "4": { col: "storage_details", table: "Product_Storage_details" }, // HDD
                "5": { col: "storage_details", table: "Product_Storage_details" }, // SSD
                "6": { col: "power_details", table: "Product_Power_details" },
                "7": { col: "case_details", table: "Product_Case_details" },
                "8": { col: "comset_details", table: "Product_Comset_details" },
                "9": { col: "vga_details", table: "Product_Vga_details" }
            };

            const mapping = detailMapping[String(pc_id)];
            let detailColumn = null;
            let detailId = null;

            // --- ขั้นตอนที่ 1: บันทึกข้อมูลสเปกย่อย (ถ้ามีการส่งมา) ---
            if (mapping && specificDetails && Object.keys(specificDetails).length > 0) {
                // ใส่ backtick (`) ครอบชื่อคอลัมน์ เผื่อมีชื่อแปลกๆ เช่น Cores/Threads
                const keys = Object.keys(specificDetails).map(k => `\`${k}\``);
                const values = Object.values(specificDetails);
                const placeholders = keys.map(() => '?').join(', ');

                const [detailResult] = await db.query(
                    `INSERT INTO ${mapping.table} (${keys.join(', ')}) VALUES (${placeholders})`,
                    values
                );
                detailId = detailResult.insertId;
                detailColumn = mapping.col;
            }

            // --- ขั้นตอนที่ 2: บันทึกข้อมูลตารางหลัก (Product) ---
            let insertProductQuery = `
                INSERT INTO Product 
                (name, details, price, price_before, amount, picture_one, picture_two, picture_three, picture_four, picture_five, pc_id, pt_id
            `;
            let queryValues = [
                name, details, price, price_before || null, amount,
                picture_one, picture_two || null, picture_three || null, picture_four || null, picture_five || null,
                pc_id, pt_id || null
            ];
            let valuePlaceholders = `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?`;

            // ถ้ามีการบันทึกสเปกย่อย ให้เอา ID มาผูกด้วย
            if (detailColumn && detailId) {
                insertProductQuery += `, ${detailColumn}`;
                valuePlaceholders += `, ?`;
                queryValues.push(detailId);
            }

            insertProductQuery += `) VALUES (${valuePlaceholders})`;

            await db.query(insertProductQuery, queryValues);
            await db.query('COMMIT');

            res.status(200).json({ message: "เพิ่มสินค้าและสเปกใหม่สำเร็จเรียบร้อย!" });

        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error inserting product:", error);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า" });
        }
    });


    // --- API สำหรับแก้ไขข้อมูลสินค้า (PUT) ---
    router.put("/products/:pid", async (req, res) => {
        const { pid } = req.params;
        const db = pool.promise();
        const {
            name, details, price, price_before, amount,
            picture_one, picture_two, picture_three, picture_four, picture_five,
            pc_id, pt_id, specificDetails
        } = req.body;

        try {
            await db.query('BEGIN'); // เริ่ม Transaction

            const detailMapping = {
                "1": { col: "cpu_details", table: "Product_Cpu_details", key: "cpu_id" },
                "2": { col: "ram_details", table: "Product_Ram_details", key: "ram_id" },
                "3": { col: "mainboard_details", table: "Product_Mainboard_details", key: "mb_id" },
                "4": { col: "storage_details", table: "Product_Storage_details", key: "st_id" },
                "5": { col: "storage_details", table: "Product_Storage_details", key: "st_id" },
                "6": { col: "power_details", table: "Product_Power_details", key: "pw_id" },
                "7": { col: "case_details", table: "Product_Case_details", key: "case_id" },
                "8": { col: "comset_details", table: "Product_Comset_details", key: "cs_id" },
                "9": { col: "vga_details", table: "Product_Vga_details", key: "vga_id" }
            };

            const mapping = detailMapping[String(pc_id)];
            let detailColumn = mapping ? mapping.col : null;
            let specificId = null;

            // เช็คว่าสินค้าตัวนี้ เคยมีสเปกย่อยผูกไว้แล้วหรือยัง
            const [prodRows] = await db.query('SELECT * FROM Product WHERE pid = ?', [pid]);
            if (prodRows.length > 0 && detailColumn) {
                specificId = prodRows[0][detailColumn];
            }

            // --- ขั้นตอนที่ 1: จัดการอัปเดตสเปกย่อย (หรือสร้างใหม่ถ้ายังไม่มี) ---
            if (mapping && specificDetails && Object.keys(specificDetails).length > 0) {
                const keys = Object.keys(specificDetails).map(k => `\`${k}\``);
                const values = Object.values(specificDetails);

                if (specificId) {
                    // ถ้ามี ID ผูกไว้อยู่แล้ว -> UPDATE ของเดิม
                    const setClause = keys.map(k => `${k} = ?`).join(', ');
                    values.push(specificId); // ID สำหรับ WHERE
                    await db.query(`UPDATE ${mapping.table} SET ${setClause} WHERE ${mapping.key} = ?`, values);
                } else {
                    // ถ้าอดีตลืมใส่สเปกย่อย (ID เป็น null) -> INSERT ใหม่ให้เลย
                    const placeholders = keys.map(() => '?').join(', ');
                    const [detailResult] = await db.query(
                        `INSERT INTO ${mapping.table} (${keys.join(', ')}) VALUES (${placeholders})`,
                        values
                    );
                    specificId = detailResult.insertId;
                }
            }

            // --- ขั้นตอนที่ 2: อัปเดตตารางหลัก Product ---
            let updateProductSql = `
                UPDATE Product SET 
                    name=?, details=?, price=?, price_before=?, amount=?, 
                    picture_one=?, picture_two=?, picture_three=?, picture_four=?, picture_five=?, 
                    pc_id=?, pt_id=?
            `;
            let productValues = [
                name, details, price, price_before || null, amount,
                picture_one, picture_two || null, picture_three || null, picture_four || null, picture_five || null,
                pc_id, pt_id || null
            ];

            // ถ้ารอบนี้เพิ่งสร้างสเปกย่อยใหม่ ให้อัปเดตเชื่อม ID คอลัมน์ด้วย
            if (detailColumn && specificId) {
                updateProductSql += `, ${detailColumn}=?`;
                productValues.push(specificId);
            }

            updateProductSql += ` WHERE pid=?`;
            productValues.push(pid);

            await db.query(updateProductSql, productValues);

            await db.query('COMMIT');
            res.status(200).json({ message: "อัปเดตข้อมูลสินค้าสำเร็จ" });

        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error updating product:", error);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลสินค้า" });
        }
    });



    // --- API สำหรับลบสินค้า (DELETE) ---
    router.delete("/products/:pid", async (req, res) => {
        const { pid } = req.params;
        try {
            await pool.promise().query("DELETE FROM Product WHERE pid = ?", [pid]);
            res.status(200).json({ message: "ลบสินค้าสำเร็จ" });
        } catch (error) {
            console.error("Error deleting product:", error);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสินค้า" });
        }
    });

    // --- 1. API เพิ่ม/แก้ไข หมวดหมู่หลัก (Product_Categories) ---
    router.post('/products/product_Categories', async (req, res) => {
        try {
            await pool.promise().query('INSERT INTO Product_Categories (name) VALUES (?)', [req.body.name]);
            res.status(200).json({ message: "เพิ่มหมวดหมู่สำเร็จ" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
        }
    });

    router.put('/products/product_Categories/:pc_id', async (req, res) => {
        try {
            await pool.promise().query('UPDATE Product_Categories SET name = ? WHERE pc_id = ?', [req.body.name, req.params.pc_id]);
            res.status(200).json({ message: "อัปเดตหมวดหมู่สำเร็จ" });
        } catch (error) {
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
        }
    });

    // --- 2. API เพิ่ม/แก้ไข ประเภทย่อย (Product_Type) ---
    router.post('/products/product_Type', async (req, res) => {
        try {
            await pool.promise().query('INSERT INTO Product_Type (name, pc_id) VALUES (?, ?)', [req.body.name, req.body.pc_id]);
            res.status(200).json({ message: "เพิ่มประเภทสำเร็จ" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มข้อมูล" });
        }
    });

    router.put('/products/product_Type/:pt_id', async (req, res) => {
        try {
            await pool.promise().query('UPDATE Product_Type SET name = ?, pc_id = ? WHERE pt_id = ?', [req.body.name, req.body.pc_id, req.params.pt_id]);
            res.status(200).json({ message: "อัปเดตประเภทสำเร็จ" });
        } catch (error) {
            res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
        }
    });


    return router;
}
