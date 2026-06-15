import express from 'express';

export default function (pool) {
    const router = express.Router();

    // ดึงข้อมูล Custom PC พร้อมชื่อของสินค้าแต่ละชิ้นส่วน
    router.get('/custompc', (req, res) => {
        const sqlQuery = `
            SELECT 
                ctp.*,
                p_cpu.name AS cpu_name,
                p_mb.name AS mb_name,
                p_vga.name AS vga_name,
                p_ram.name AS ram_name,
                p_hdd.name AS hdd_name,
                p_ssd.name AS ssd_name,
                p_pw.name AS pw_name,
                p_case.name AS case_name

            FROM Custom_PC ctp
            LEFT JOIN Product p_case ON ctp.Cases = p_case.pid
            LEFT JOIN Product p_cpu ON ctp.Cpu = p_cpu.pid
            LEFT JOIN Product p_hdd ON ctp.HDD = p_hdd.pid
            LEFT JOIN Product p_mb ON ctp.Mainboard = p_mb.pid
            LEFT JOIN Product p_pw ON ctp.Power = p_pw.pid
            LEFT JOIN Product p_ram ON ctp.Ram = p_ram.pid
            LEFT JOIN Product p_ssd ON ctp.SSD = p_ssd.pid
            LEFT JOIN Product p_vga ON ctp.Vga = p_vga.pid

        `;

        pool.query(sqlQuery, (err, results) => {
            if (err) {
                console.error('Error finding custom pc details:', err);
                return res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
            }
            res.json(results);
        });
    });

    return router;
}