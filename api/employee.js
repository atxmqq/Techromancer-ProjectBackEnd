import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploadsEmployeeProfile/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = file.originalname.split('.').pop();
        cb(null, 'profile-' + uniqueSuffix + '.' + extension);
    }
});

const upload = multer({ storage: storage });

export default function (pool) {
    const router = express.Router();

    router.get('/employee', (req, res) => {
        pool.query(
            'SELECT eid, email, username, fullname, phone, type, status FROM Employee',
            (err, results) => {
                if (err) {
                    console.error('Error finding user:', err);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
                }
                res.json(results);
            }
        );
    });

    router.get('/employee/:eid', (req, res) => {
        const { eid } = req.params;
        pool.query(
            'SELECT eid, username, email, phone, fullname, profile, address, guarantor, house_registration, national_id, type, status FROM Employee WHERE eid = ?',
            [eid],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
                if (results.length === 0) return res.status(404).json({ error: 'ไม่พบพนักงาน' });
                res.json(results[0]);
            }
        );
    });

    router.post('/employeereg', async (req, res) => {
        const { username, fullname, email, password, phone } = req.body;

        try {
            pool.query(
                'SELECT username, email, phone FROM Employee WHERE username = ? OR email = ? OR phone = ?',
                [username, email, phone],
                async (err, results) => {
                    if (err) return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });

                    if (results.length > 0) {
                        const existingUser = results[0];
                        if (existingUser.username === username) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้ (Username) ถูกใช้งานแล้ว' });
                        if (existingUser.email === email) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
                        if (existingUser.phone === phone) return res.status(400).json({ error: 'หมายเลขโทรศัพท์นี้ถูกใช้งานแล้ว' });
                    }

                    const hashedPassword = await bcrypt.hash(password, 10);

                    pool.query(
                        'INSERT INTO Employee (username, fullname, email, password, phone, type) VALUES (?, ?, ?, ?, ?, ?)',
                        [username, fullname, email, hashedPassword, phone, 'Employee'],
                        (insertErr) => {
                            if (insertErr) {
                                console.error('Insert Error:', insertErr);
                                return res.status(500).json({ error: 'เพิ่มพนักงานไม่สำเร็จ' });
                            }
                            return res.status(200).json({ message: 'เพิ่มพนักงานสำเร็จ!' });
                        }
                    );
                }
            );
        } catch (error) {
            res.status(500).json({ error: 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์' });
        }
    });

    router.put('/employee/update-profile/:eid', upload.single('profile_image'), (req, res) => {
        const { eid } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพ' });
        }

        const imageUrl = `http://localhost:3001/uploadsEmployeeProfile/${req.file.filename}`;
        const sqlQuery = `UPDATE Employee SET profile = ? WHERE eid = ?`;

        pool.query(sqlQuery, [imageUrl, eid], (err, results) => {
            if (err) {
                console.error('Error updating profile image:', err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกรูปโปรไฟล์' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
            }

            res.json({ message: 'อัปเดตโปรไฟล์สำเร็จ', profileUrl: imageUrl });
        });
    });

    router.put('/employee/update-house-reg/:eid', upload.single('house_reg_image'), (req, res) => {
        const { eid } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'กรุณาเลือกไฟล์รูปภาพ' });
        }

        const imageUrl = `http://localhost:3001/uploadsEmployeeProfile/${req.file.filename}`;
        const sqlQuery = `UPDATE Employee SET house_registration = ? WHERE eid = ?`;

        pool.query(sqlQuery, [imageUrl, eid], (err, results) => {
            if (err) {
                console.error('Error updating house registration image:', err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกรูปทะเบียนบ้าน' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
            }

            res.json({ message: 'อัปโหลดทะเบียนบ้านสำเร็จ', houseRegUrl: imageUrl });
        });
    });

    // --- API สำหรับอัปเดตข้อมูลส่วนตัว (แก้บั๊ก SQL Syntax เรียบร้อย) ---
    router.put('/employee/update-info/:eid', (req, res) => {
        const { eid } = req.params;
        const { fullname, email, phone, national_id, guarantor } = req.body;

        const checkQuery = `
            SELECT fullname, email, phone, national_id 
            FROM Employee 
            WHERE (fullname = ? OR email = ? OR phone = ? OR (national_id = ? AND national_id != '')) AND eid != ?
        `;

        pool.query(checkQuery, [fullname, email, phone, national_id, eid], (err, results) => {
            if (err) {
                console.error('Error checking duplicate info:', err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
            }

            if (results.length > 0) {
                const existing = results[0];
                if (existing.fullname === fullname) return res.status(400).json({ error: 'ชื่อ-นามสกุลนี้มีในระบบแล้ว' });
                if (existing.email === email) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานโดยพนักงานท่านอื่นแล้ว' });
                if (existing.phone === phone) return res.status(400).json({ error: 'เบอร์โทรศัพท์นี้ถูกใช้งานโดยพนักงานท่านอื่นแล้ว' });
                if (existing.national_id === national_id && national_id !== '') return res.status(400).json({ error: 'รหัสบัตรประชาชนนี้ถูกใช้งานโดยพนักงานท่านอื่นแล้ว' });
            }

            const updateQuery = `UPDATE Employee SET fullname = ?, email = ?, phone = ?, national_id = ?, guarantor = ? WHERE eid = ?`;
            pool.query(updateQuery, [fullname, email, phone, national_id, guarantor, eid], (updateErr, updateResults) => {
                if (updateErr) {
                    console.error('Error updating employee info:', updateErr);
                    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
                }

                if (updateResults.affectedRows === 0) {
                    return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
                }

                res.json({ message: 'อัปเดตข้อมูลสำเร็จ' });
            });
        });
    });


    // --- API สำหรับอัปเดตสถานะพนักงาน ---
    router.put('/employee/update-status/:eid', (req, res) => {
        const { eid } = req.params;
        const { status } = req.body;

        const sqlQuery = `UPDATE Employee SET status = ? WHERE eid = ?`;

        pool.query(sqlQuery, [status, eid], (err, results) => {
            if (err) {
                console.error('Error updating status:', err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' });
            }

            res.json({ message: 'อัปเดตสถานะพนักงานสำเร็จ' });
        });
    });

    
    return router;
}