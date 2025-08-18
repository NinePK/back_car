-- Car Rental database schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS `car_rental`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `car_rental`;

-- users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL UNIQUE,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('customer','shop') NOT NULL DEFAULT 'customer',
  `phone` VARCHAR(20) NULL,
  `address` TEXT NULL,
  `profile_image` VARCHAR(255) NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `shop_name` VARCHAR(255) NULL,
  `shop_description` TEXT NULL,
  `promptpay_id` VARCHAR(64) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- cars
CREATE TABLE IF NOT EXISTS `cars` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shop_id` INT NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `year` INT NOT NULL,
  `license_plate` VARCHAR(20) NOT NULL,
  `car_type` ENUM('sedan','suv','hatchback','pickup','van','luxury') NOT NULL,
  `transmission` ENUM('auto','manual') NOT NULL,
  `fuel_type` ENUM('gasoline','diesel','hybrid','electric') NOT NULL,
  `seats` INT NOT NULL,
  `color` VARCHAR(50) NOT NULL,
  `daily_rate` DECIMAL(10,2) NOT NULL,
  `insurance_rate` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('available','rented','maintenance','hidden') NOT NULL DEFAULT 'available',
  `description` TEXT NULL,
  `image_url` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cars_shop` FOREIGN KEY (`shop_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- car_images
CREATE TABLE IF NOT EXISTS `car_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `car_id` INT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_car_images_car` FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- rentals
CREATE TABLE IF NOT EXISTS `rentals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `car_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `shop_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `pickup_location` VARCHAR(255) NULL,
  `return_location` VARCHAR(255) NULL,
  `rental_status` ENUM('pending','confirmed','ongoing','completed','cancelled','return_requested','return_approved') NOT NULL DEFAULT 'pending',
  `payment_status` ENUM('pending','pending_verification','paid','rejected','refunded','failed') NOT NULL DEFAULT 'pending',
  `total_amount` DECIMAL(10,2) NOT NULL,
  `deposit_amount` DECIMAL(10,2) NULL,
  `insurance_rate` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rentals_car` FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`),
  CONSTRAINT `fk_rentals_customer` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_rentals_shop` FOREIGN KEY (`shop_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB;

-- payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rental_id` INT NOT NULL,
  `payment_method` ENUM('credit_card','bank_transfer','cash','qr_code','promptpay') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_date` DATETIME NULL,
  `payment_status` ENUM('pending','pending_verification','paid','rejected','failed','refunded') NOT NULL DEFAULT 'pending',
  `transaction_id` VARCHAR(100) NULL,
  `proof_image` VARCHAR(255) NULL,
  `verified_at` DATETIME NULL,
  `verified_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payments_rental` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rental_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `shop_id` INT NOT NULL,
  `car_id` INT NOT NULL,
  `rating` TINYINT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reviews_rental` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`),
  CONSTRAINT `fk_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_reviews_shop` FOREIGN KEY (`shop_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_reviews_car` FOREIGN KEY (`car_id`) REFERENCES `cars`(`id`)
) ENGINE=InnoDB;


