import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: {
    name: { type: String, required: true },
    sku: { type: String, required: true },
  },
  quantitySold: { type: Number, required: true, min: 1 },
  unitPriceAtSaleTZS: { type: Number, required: true, min: 0 },
  totalPriceTZS: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'mobile', 'card'], required: true },
  paymentStatus: { type: String, enum: ['paid', 'pending'], required: true, default: 'paid' },
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

saleSchema.index({ date: -1 });
saleSchema.index({ productId: 1 });
saleSchema.index({ soldBy: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ date: -1, productId: 1 });

const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);
export default Sale;
