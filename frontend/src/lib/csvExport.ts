export const jsonToCSV = (data: Record<string, unknown>[]): string => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  const dataRows = data.map(item =>
    headers.map(header => {
      let value: unknown = item[header];
      if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
      if (value === null || value === undefined) value = '';
      let str = String(value).replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) str = `"${str}"`;
      return str;
    }).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
};

export const formatSalesForCSV = (sales: any[]) =>
  sales.map(sale => ({
    'Date': new Date(sale.date).toLocaleDateString('en-US'),
    'Product Name': sale.productSnapshot?.name || 'N/A',
    'SKU': sale.productSnapshot?.sku || 'N/A',
    'Quantity': sale.quantitySold,
    'Unit Price (TZS)': sale.unitPriceAtSaleTZS,
    'Total (TZS)': sale.totalPriceTZS,
    'Payment Method': sale.paymentMethod,
    'Payment Status': sale.paymentStatus,
    'Sold By': sale.soldBy?.fullName || sale.soldBy?.email || 'N/A',
  }));

export const formatPurchasesForCSV = (purchases: any[]) =>
  purchases.map(purchase => ({
    'Date': new Date(purchase.date).toLocaleDateString('en-US'),
    'Product Name': purchase.productId?.name || 'N/A',
    'SKU': purchase.productId?.sku || 'N/A',
    'Quantity': purchase.quantityPurchased,
    'Unit Cost (TZS)': purchase.unitCostTZS,
    'Total Cost (TZS)': purchase.totalCostTZS,
    'Supplier': purchase.supplierText || 'N/A',
    'Purchased By': purchase.purchasedBy?.fullName || purchase.purchasedBy?.email || 'N/A',
  }));

export const formatStockForCSV = (products: any[]) =>
  products.map(product => ({
    'Product Name': product.name,
    'SKU': product.sku,
    'Category': product.category,
    'Unit Price (TZS)': product.unitPriceTZS,
    'Cost Price (TZS)': product.costPriceTZS,
    'Stock Quantity': product.stockQuantity,
    'Stock Value (TZS)': product.unitPriceTZS * product.stockQuantity,
    'Status': product.stockQuantity <= 5 ? 'Low Stock' : 'In Stock',
  }));
