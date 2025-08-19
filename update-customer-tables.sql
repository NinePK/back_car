-- back/update-customer-tables.sql
-- อัปเดตฐานข้อมูลเพื่อรองรับฟีเจอร์ใหม่สำหรับลูกค้า

-- เพิ่มฟิลด์ phone และ address ในตาราง users (ถ้ายังไม่มี)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS address TEXT NULL,
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) NULL;

-- อัปเดตข้อมูลตัวอย่างสำหรับลูกค้า (ถ้าต้องการ)
-- UPDATE users SET phone = '0812345678', address = 'กรุงเทพมหานคร' WHERE role = 'customer' AND phone IS NULL;

-- ตรวจสอบโครงสร้างตาราง rentals
-- ตรวจสอบว่ามีฟิลด์ที่จำเป็นครบหรือไม่
-- rental_status: pending, confirmed, ongoing, completed, cancelled, return_requested, return_approved
-- payment_status: pending, paid, refunded, refund_pending, failed

-- สร้าง index เพื่อเพิ่มประสิทธิภาพการค้นหา
CREATE INDEX IF NOT EXISTS idx_rentals_customer_id ON rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_rental_status ON rentals(rental_status);
CREATE INDEX IF NOT EXISTS idx_rentals_payment_status ON rentals(payment_status);
CREATE INDEX IF NOT EXISTS idx_rentals_created_at ON rentals(created_at);

-- สร้าง index สำหรับตาราง cars
CREATE INDEX IF NOT EXISTS idx_cars_shop_id ON cars(shop_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);

-- สร้าง index สำหรับตาราง users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- แสดงโครงสร้างตารางที่อัปเดตแล้ว
SELECT 'Users table structure:' as info;
DESCRIBE users;

SELECT 'Rentals table structure:' as info;
DESCRIBE rentals;

SELECT 'Cars table structure:' as info;
DESCRIBE cars;
