import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['transport', 'food', 'maintenance', 'taxes', 'other'],
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  date: { type: Date, required: true, default: Date.now },
  paymentMethod: {
    type: String,
    enum: ['cash', 'mobile_money', 'bank_transfer', 'card'],
    default: 'cash',
  },
  receiptNumber: { type: String, trim: true, maxlength: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ date: -1, category: 1 });

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export default Expense;
