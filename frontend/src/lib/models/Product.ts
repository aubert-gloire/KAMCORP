import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  unitPriceTZS: { type: Number, required: true, min: 0 },
  costPriceTZS: { type: Number, required: true, min: 0 },
  stockQuantity: { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, default: 10 },
}, { timestamps: true });

productSchema.index({ category: 1 });
productSchema.index({ stockQuantity: 1 });
productSchema.index({ name: 'text' });

productSchema.virtual('isLowStock').get(function (this: any) {
  return this.stockQuantity <= (this.reorderLevel ?? 10);
});
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
