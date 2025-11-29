import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  quantityPurchased: {
    type: Number,
    required: [true, 'Quantity purchased is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitCostTZS: {
    type: Number,
    required: [true, 'Unit cost is required'],
    min: [0, 'Unit cost cannot be negative']
  },
  totalCostTZS: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0, 'Total cost cannot be negative']
  },
  supplierText: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true
  },
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Purchased by user is required']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
purchaseSchema.index({ date: -1 });
purchaseSchema.index({ productId: 1 });
purchaseSchema.index({ purchasedBy: 1 });
purchaseSchema.index({ supplierText: 1 });
purchaseSchema.index({ date: -1, productId: 1 }); // Compound index for reports

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
