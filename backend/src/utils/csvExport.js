/**
 * CSV Export Utility
 * Converts data to CSV format for download
 */

/**
 * Convert array of objects to CSV string
 */
export const jsonToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const columnHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = columnHeaders.join(',');
  
  // Create data rows
  const dataRows = data.map(item => {
    return columnHeaders.map(header => {
      let value = item[header];
      
      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape quotes
      value = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, newline, or quote
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`;
      }
      
      return value;
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Format sales data for CSV export
 */
export const formatSalesForCSV = (sales) => {
  return sales.map(sale => ({
    'Date': new Date(sale.date).toLocaleDateString('en-US'),
    'Product Name': sale.productSnapshot?.name || 'N/A',
    'SKU': sale.productSnapshot?.sku || 'N/A',
    'Quantity': sale.quantitySold,
    'Unit Price (TZS)': sale.unitPriceAtSaleTZS,
    'Total (TZS)': sale.totalPriceTZS,
    'Payment Method': sale.paymentMethod,
    'Payment Status': sale.paymentStatus,
    'Sold By': sale.soldBy?.fullName || sale.soldBy?.email || 'N/A'
  }));
};

/**
 * Format purchases data for CSV export
 */
export const formatPurchasesForCSV = (purchases) => {
  return purchases.map(purchase => ({
    'Date': new Date(purchase.date).toLocaleDateString('en-US'),
    'Product Name': purchase.productId?.name || 'N/A',
    'SKU': purchase.productId?.sku || 'N/A',
    'Quantity': purchase.quantityPurchased,
    'Unit Cost (TZS)': purchase.unitCostTZS,
    'Total Cost (TZS)': purchase.totalCostTZS,
    'Supplier': purchase.supplierText || 'N/A',
    'Purchased By': purchase.purchasedBy?.fullName || purchase.purchasedBy?.email || 'N/A'
  }));
};

/**
 * Format products/stock data for CSV export
 */
export const formatStockForCSV = (products) => {
  return products.map(product => ({
    'Product Name': product.name,
    'SKU': product.sku,
    'Category': product.category,
    'Unit Price (TZS)': product.unitPriceTZS,
    'Cost Price (TZS)': product.costPriceTZS,
    'Stock Quantity': product.stockQuantity,
    'Stock Value (TZS)': product.unitPriceTZS * product.stockQuantity,
    'Status': product.stockQuantity <= 5 ? 'Low Stock' : 'In Stock'
  }));
};

/**
 * Format aggregated report data for CSV
 */
export const formatReportDataForCSV = (data, reportType) => {
  switch (reportType) {
    case 'sales':
      return data.map(item => ({
        'Period': item._id,
        'Revenue (TZS)': item.revenue || 0,
        'Orders': item.orders || 0,
        'Items Sold': item.quantity || 0
      }));
    
    case 'purchases':
      return data.map(item => ({
        'Period': item._id,
        'Total Cost (TZS)': item.cost || 0,
        'Purchases': item.count || 0,
        'Items Purchased': item.quantity || 0
      }));
    
    default:
      return data;
  }
};

export default {
  jsonToCSV,
  formatSalesForCSV,
  formatPurchasesForCSV,
  formatStockForCSV,
  formatReportDataForCSV
};
