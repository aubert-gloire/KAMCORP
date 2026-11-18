import Notification from './models/Notification';

export const createNotification = async ({
  userId, type, title, message, link, meta,
}: {
  userId: unknown; type: string; title: string; message: string; link?: string; meta?: unknown;
}) => {
  try {
    return await Notification.create({ userId, type, title, message, link, meta });
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

export const createLowStockNotification = async (product: any, allAdmins: any[]) => {
  try {
    const notifications = allAdmins.map(admin => ({
      userId: admin._id,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${product.name} is running low (${product.stockQuantity} remaining)`,
      link: '/products',
      meta: { productId: product._id, productName: product.name, stockQuantity: product.stockQuantity },
    }));
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Create low stock notification error:', error);
  }
};

export const createSaleNotification = async (sale: any, userId: unknown) => {
  try {
    await createNotification({
      userId,
      type: 'sale',
      title: 'New Sale Recorded',
      message: `Sale of ${sale.quantity} ${sale.productId?.name || 'product'} for TZS ${sale.totalPrice.toLocaleString()}`,
      link: '/sales',
      meta: { saleId: sale._id, productName: sale.productId?.name, quantity: sale.quantity, totalPrice: sale.totalPrice },
    });
  } catch (error) {
    console.error('Create sale notification error:', error);
  }
};

export const createPurchaseNotification = async (purchase: any, userId: unknown) => {
  try {
    await createNotification({
      userId,
      type: 'purchase',
      title: 'New Purchase Recorded',
      message: `Purchased ${purchase.quantity} ${purchase.productId?.name || 'product'} for TZS ${purchase.totalCost.toLocaleString()}`,
      link: '/purchases',
      meta: { purchaseId: purchase._id, productName: purchase.productId?.name, quantity: purchase.quantity, totalCost: purchase.totalCost },
    });
  } catch (error) {
    console.error('Create purchase notification error:', error);
  }
};

export const createExpenseNotification = async (expense: any, userId: unknown) => {
  try {
    await createNotification({
      userId,
      type: 'system',
      title: 'New Expense Recorded',
      message: `${expense.createdBy} added a ${expense.category} expense of TZS ${expense.amount.toLocaleString()}`,
      link: '/expenses',
      meta: { category: expense.category, amount: expense.amount, description: expense.description },
    });
  } catch (error) {
    console.error('Create expense notification error:', error);
  }
};
