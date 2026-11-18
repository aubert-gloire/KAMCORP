import AuditLog from './models/AuditLog';

export const createAuditLog = async ({
  userId,
  action,
  entityType,
  entityId = null,
  meta = {},
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: unknown;
  meta?: Record<string, unknown>;
}) => {
  try {
    await AuditLog.create({ userId, action, entityType, entityId, meta });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
