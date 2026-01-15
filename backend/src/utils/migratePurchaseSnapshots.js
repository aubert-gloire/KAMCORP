import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';

// Load environment variables
dotenv.config();

/**
 * Migration script to add productSnapshot to existing purchases
 * Run this once after deploying the new code
 */
async function migratePurchaseSnapshots() {
  try {
    console.log('🔄 Starting migration: Adding productSnapshot to purchases...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all purchases without productSnapshot
    const purchasesWithoutSnapshot = await Purchase.find({
      productSnapshot: { $exists: false }
    }).populate('productId', 'name sku');

    console.log(`Found ${purchasesWithoutSnapshot.length} purchases without productSnapshot\n`);

    if (purchasesWithoutSnapshot.length === 0) {
      console.log('✅ All purchases already have productSnapshot. Migration not needed.\n');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;

    for (const purchase of purchasesWithoutSnapshot) {
      try {
        if (purchase.productId) {
          // Product still exists - use current data
          purchase.productSnapshot = {
            name: purchase.productId.name,
            sku: purchase.productId.sku
          };
          await purchase.save();
          updated++;
          console.log(`✅ Updated purchase ${purchase._id} - ${purchase.productId.name}`);
        } else {
          // Product was deleted - use placeholder
          purchase.productSnapshot = {
            name: '[Deleted Product]',
            sku: 'N/A'
          };
          await purchase.save();
          updated++;
          console.log(`⚠️  Updated purchase ${purchase._id} - [Deleted Product]`);
        }
      } catch (error) {
        console.error(`❌ Failed to update purchase ${purchase._id}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Skipped: ${skipped}`);
    console.log(`   📦 Total:   ${purchasesWithoutSnapshot.length}\n`);

    console.log('✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePurchaseSnapshots();
