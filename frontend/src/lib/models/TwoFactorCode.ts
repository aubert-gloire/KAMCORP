import mongoose from 'mongoose';

const twoFactorCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  used: { type: Boolean, default: false },
}, { timestamps: true });

twoFactorCodeSchema.index({ userId: 1, code: 1 });

const TwoFactorCode = mongoose.models.TwoFactorCode || mongoose.model('TwoFactorCode', twoFactorCodeSchema);
export default TwoFactorCode;
