import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  productSnapshot: {
    name: { type: String, required: true },
    sku: { type: String, required: true }
  },
  quantitySold: {
    type: Number,
    required: [true, 'Quantity sold is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPriceAtSaleTZS: {
    type: Number,
    required: [true, 'Unit price at sale is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPriceTZS: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'mobile', 'card'],
    required: [true, 'Payment method is required']
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    required: [true, 'Payment status is required'],
    default: 'paid'
  },
  soldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sold by user is required']
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance - critical for reports
saleSchema.index({ date: -1 });
saleSchema.index({ productId: 1 });
saleSchema.index({ soldBy: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ date: -1, productId: 1 }); // Compound index for reports

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
