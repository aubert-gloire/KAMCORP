import AuditLog from '../models/AuditLog.js';

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action performed
 * @param {string} params.entityType - Type of entity
 * @param {string} params.entityId - Entity ID (optional)
 * @param {Object} params.meta - Additional metadata (optional)
 */
export const createAuditLog = async ({ userId, action, entityType, entityId = null, meta = {} }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      meta
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error - audit logging failure shouldn't break the main operation
  }
};

/**
 * Get audit logs with pagination
 * @param {Object} filters - Filter parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 */
export const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  try {
    const skip = (page - 1) * limit;
    
    const logs = await AuditLog.find(filters)
      .populate('userId', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(filters);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    throw error;
  }
};
