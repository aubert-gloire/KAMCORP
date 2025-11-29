import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: {
        values: ['transport', 'food', 'maintenance', 'taxes', 'other'],
        message: '{VALUE} is not a valid expense category'
      }
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'mobile_money', 'bank_transfer', 'card'],
        message: '{VALUE} is not a valid payment method'
      },
      default: 'cash'
    },
    receiptNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Receipt number cannot exceed 100 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ date: -1, category: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
