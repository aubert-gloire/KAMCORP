import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'login_2fa', 'logout', 'create_user', 'create_product',
      'update_product', 'delete_product', 'create_sale', 'create_purchase',
      'create_expense', 'update_expense', 'delete_expense', 'reset_password',
      'update_user', 'delete_user',
    ],
  },
  entityType: { type: String, enum: ['user', 'product', 'sale', 'purchase', 'expense', 'auth'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
