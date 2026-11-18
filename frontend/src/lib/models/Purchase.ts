import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productSnapshot: {
    name: { type: String, required: true },
    sku: { type: String, required: true },
  },
  quantityPurchased: { type: Number, required: true, min: 1 },
  unitCostTZS: { type: Number, required: true, min: 0 },
  totalCostTZS: { type: Number, required: true, min: 0 },
  supplierText: { type: String, required: true, trim: true },
  purchasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

purchaseSchema.index({ date: -1 });
purchaseSchema.index({ productId: 1 });
purchaseSchema.index({ purchasedBy: 1 });
purchaseSchema.index({ supplierText: 1 });
purchaseSchema.index({ date: -1, productId: 1 });

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
export default Purchase;
