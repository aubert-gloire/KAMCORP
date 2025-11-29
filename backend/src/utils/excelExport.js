import ExcelJS from 'exceljs';

/**
 * Generate Excel for Sales Report
 */
export const generateSalesExcel = async (sales, dateRange) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Set column widths
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Unit Price (TZS)', key: 'unitPrice', width: 15 },
    { header: 'Total Price (TZS)', key: 'totalPrice', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Sold By', key: 'soldBy', width: 20 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4B5563' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  sales.forEach((sale) => {
    worksheet.addRow({
      date: new Date(sale.date).toLocaleDateString(),
      productName: sale.productId?.name || 'N/A',
      sku: sale.productId?.sku || 'N/A',
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalPrice: sale.totalPrice,
      paymentMethod: sale.paymentMethod,
      paymentStatus: sale.paymentStatus,
      soldBy: sale.soldBy?.fullName || 'N/A',
    });
  });

  // Add summary row
  const summaryRow = worksheet.addRow({
    date: '',
    productName: '',
    sku: '',
    quantity: sales.reduce((sum, s) => sum + s.quantity, 0),
    unitPrice: '',
    totalPrice: sales.reduce((sum, s) => sum + s.totalPrice, 0),
    paymentMethod: '',
    paymentStatus: '',
    soldBy: 'TOTAL',
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  // Format currency columns
  worksheet.getColumn('unitPrice').numFmt = '#,##0';
  worksheet.getColumn('totalPrice').numFmt = '#,##0';

  return workbook;
};

/**
 * Generate Excel for Purchases Report
 */
export const generatePurchasesExcel = async (purchases, dateRange) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Purchases Report');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Unit Cost (TZS)', key: 'unitCost', width: 15 },
    { header: 'Total Cost (TZS)', key: 'totalCost', width: 15 },
    { header: 'Supplier', key: 'supplier', width: 25 },
    { header: 'Purchased By', key: 'purchasedBy', width: 20 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4B5563' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  purchases.forEach((purchase) => {
    worksheet.addRow({
      date: new Date(purchase.date).toLocaleDateString(),
      productName: purchase.productId?.name || 'N/A',
      sku: purchase.productId?.sku || 'N/A',
      quantity: purchase.quantity,
      unitCost: purchase.unitCost,
      totalCost: purchase.totalCost,
      supplier: purchase.supplier || 'N/A',
      purchasedBy: purchase.purchasedBy?.fullName || 'N/A',
    });
  });

  // Summary
  const summaryRow = worksheet.addRow({
    date: '',
    productName: '',
    sku: '',
    quantity: purchases.reduce((sum, p) => sum + p.quantity, 0),
    unitCost: '',
    totalCost: purchases.reduce((sum, p) => sum + p.totalCost, 0),
    supplier: '',
    purchasedBy: 'TOTAL',
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  // Format currency
  worksheet.getColumn('unitCost').numFmt = '#,##0';
  worksheet.getColumn('totalCost').numFmt = '#,##0';

  return workbook;
};

/**
 * Generate Excel for Stock Report
 */
export const generateStockExcel = async (products) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock Report');

  worksheet.columns = [
    { header: 'Product Name', key: 'name', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Unit Price (TZS)', key: 'price', width: 15 },
    { header: 'Cost Price (TZS)', key: 'costPrice', width: 15 },
    { header: 'Stock Quantity', key: 'stockQuantity', width: 15 },
    { header: 'Stock Value (TZS)', key: 'stockValue', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4B5563' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data
  products.forEach((product) => {
    const stockValue = product.stockQuantity * product.price;
    const status = product.stockQuantity <= 5 ? 'Low Stock' : 'In Stock';
    
    const row = worksheet.addRow({
      name: product.name,
      sku: product.sku || 'N/A',
      category: product.category || 'N/A',
      price: product.price,
      costPrice: product.costPrice || 0,
      stockQuantity: product.stockQuantity,
      stockValue: stockValue,
      status: status,
    });

    // Color low stock rows
    if (product.stockQuantity <= 5) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      };
    }
  });

  // Summary
  const totalValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.price), 0);
  const summaryRow = worksheet.addRow({
    name: '',
    sku: '',
    category: '',
    price: '',
    costPrice: '',
    stockQuantity: products.reduce((sum, p) => sum + p.stockQuantity, 0),
    stockValue: totalValue,
    status: 'TOTAL',
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };

  // Format currency
  worksheet.getColumn('price').numFmt = '#,##0';
  worksheet.getColumn('costPrice').numFmt = '#,##0';
  worksheet.getColumn('stockValue').numFmt = '#,##0';

  return workbook;
};
