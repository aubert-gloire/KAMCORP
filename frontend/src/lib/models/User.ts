import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  fullName: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'sales', 'stock'], required: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ role: 1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
