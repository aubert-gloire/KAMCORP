import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Product from '../models/Product.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('kamcorp123', salt);

    const users = await User.create([
      {
        email: 'kamautomotive.tz@gmail.com',
        fullName: 'Admin User',
        passwordHash: defaultPassword,
        role: 'admin'
      },
      {
        email: 'sales@kamcorp.co.tz',
        fullName: 'Sales Manager',
        passwordHash: defaultPassword,
        role: 'sales'
      },
      {
        email: 'stock@kamcorp.co.tz',
        fullName: 'Stock Manager',
        passwordHash: defaultPassword,
        role: 'stock'
      }
    ]);

    console.log('👥 Created users:');
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - Password: kamcorp123`);
    });

    // Create sample products
    const products = await Product.create([
      {
        name: 'Laptop Dell Inspiron 15',
        sku: 'TECH-LAP-001',
        category: 'Electronics',
        unitPriceTZS: 1500000,
        costPriceTZS: 1200000,
        stockQuantity: 10
      },
      {
        name: 'Office Chair Executive',
        sku: 'FURN-CHR-001',
        category: 'Furniture',
        unitPriceTZS: 350000,
        costPriceTZS: 250000,
        stockQuantity: 3
      },
      {
        name: 'Printer HP LaserJet',
        sku: 'TECH-PRT-001',
        category: 'Electronics',
        unitPriceTZS: 800000,
        costPriceTZS: 650000,
        stockQuantity: 8
      },
      {
        name: 'Desk Wooden L-Shape',
        sku: 'FURN-DSK-001',
        category: 'Furniture',
        unitPriceTZS: 450000,
        costPriceTZS: 350000,
        stockQuantity: 5
      },
      {
        name: 'Monitor LG 24-inch',
        sku: 'TECH-MON-001',
        category: 'Electronics',
        unitPriceTZS: 400000,
        costPriceTZS: 320000,
        stockQuantity: 12
      },
      {
        name: 'Wireless Mouse Logitech',
        sku: 'TECH-MOU-001',
        category: 'Electronics',
        unitPriceTZS: 45000,
        costPriceTZS: 35000,
        stockQuantity: 25
      },
      {
        name: 'Keyboard Mechanical RGB',
        sku: 'TECH-KEY-001',
        category: 'Electronics',
        unitPriceTZS: 120000,
        costPriceTZS: 90000,
        stockQuantity: 15
      },
      {
        name: 'Filing Cabinet 4-Drawer',
        sku: 'FURN-CAB-001',
        category: 'Furniture',
        unitPriceTZS: 280000,
        costPriceTZS: 220000,
        stockQuantity: 4
      },
      {
        name: 'Webcam Logitech HD',
        sku: 'TECH-CAM-001',
        category: 'Electronics',
        unitPriceTZS: 150000,
        costPriceTZS: 110000,
        stockQuantity: 2
      },
      {
        name: 'Whiteboard Magnetic 6x4ft',
        sku: 'OFF-WHT-001',
        category: 'Office Supplies',
        unitPriceTZS: 180000,
        costPriceTZS: 140000,
        stockQuantity: 6
      }
    ]);

    console.log(`📦 Created ${products.length} sample products`);

    console.log('\n✨ Database seeded successfully!');
    console.log('\n📋 Login credentials:');
    console.log('   Admin: kamautomotive.tz@gmail.com / kamcorp123');
    console.log('   Sales: sales@kamcorp.co.tz / kamcorp123');
    console.log('   Stock: stock@kamcorp.co.tz / kamcorp123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();
