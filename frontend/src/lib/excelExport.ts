import ExcelJS from 'exceljs';

const headerStyle = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4B5563' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
};

export const generateSalesExcel = async (sales: any[], _dateRange: string): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sales Report');
  ws.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Unit Price (TZS)', key: 'unitPrice', width: 18 },
    { header: 'Total Price (TZS)', key: 'totalPrice', width: 18 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Sold By', key: 'soldBy', width: 20 },
  ];
  Object.assign(ws.getRow(1), headerStyle);
  sales.forEach(s => ws.addRow({
    date: new Date(s.date).toLocaleDateString(),
    productName: s.productSnapshot?.name || s.productId?.name || 'N/A',
    sku: s.productSnapshot?.sku || s.productId?.sku || 'N/A',
    quantity: s.quantitySold,
    unitPrice: s.unitPriceAtSaleTZS,
    totalPrice: s.totalPriceTZS,
    paymentMethod: s.paymentMethod,
    paymentStatus: s.paymentStatus,
    soldBy: s.soldBy?.fullName || 'N/A',
  }));
  ws.getColumn('unitPrice').numFmt = '#,##0';
  ws.getColumn('totalPrice').numFmt = '#,##0';
  return wb.xlsx.writeBuffer() as Promise<Buffer>;
};

export const generatePurchasesExcel = async (purchases: any[], _dateRange: string): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Purchases Report');
  ws.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Unit Cost (TZS)', key: 'unitCost', width: 18 },
    { header: 'Total Cost (TZS)', key: 'totalCost', width: 18 },
    { header: 'Supplier', key: 'supplier', width: 25 },
    { header: 'Purchased By', key: 'purchasedBy', width: 20 },
  ];
  Object.assign(ws.getRow(1), headerStyle);
  purchases.forEach(p => ws.addRow({
    date: new Date(p.date).toLocaleDateString(),
    productName: p.productId?.name || 'N/A',
    sku: p.productId?.sku || 'N/A',
    quantity: p.quantityPurchased,
    unitCost: p.unitCostTZS,
    totalCost: p.totalCostTZS,
    supplier: p.supplierText || 'N/A',
    purchasedBy: p.purchasedBy?.fullName || 'N/A',
  }));
  ws.getColumn('unitCost').numFmt = '#,##0';
  ws.getColumn('totalCost').numFmt = '#,##0';
  return wb.xlsx.writeBuffer() as Promise<Buffer>;
};

export const generateStockExcel = async (products: any[]): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Stock Report');
  ws.columns = [
    { header: 'Product Name', key: 'name', width: 30 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Unit Price (TZS)', key: 'price', width: 18 },
    { header: 'Cost Price (TZS)', key: 'costPrice', width: 18 },
    { header: 'Stock Quantity', key: 'stockQuantity', width: 15 },
    { header: 'Stock Value (TZS)', key: 'stockValue', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  Object.assign(ws.getRow(1), headerStyle);
  products.forEach(p => {
    const row = ws.addRow({
      name: p.name,
      sku: p.sku || 'N/A',
      category: p.category || 'N/A',
      price: p.unitPriceTZS,
      costPrice: p.costPriceTZS || 0,
      stockQuantity: p.stockQuantity,
      stockValue: p.stockQuantity * p.unitPriceTZS,
      status: p.stockQuantity <= 5 ? 'Low Stock' : 'In Stock',
    });
    if (p.stockQuantity <= 5) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    }
  });
  ws.getColumn('price').numFmt = '#,##0';
  ws.getColumn('costPrice').numFmt = '#,##0';
  ws.getColumn('stockValue').numFmt = '#,##0';
  return wb.xlsx.writeBuffer() as Promise<Buffer>;
};

export const generateExpensesExcel = async (expenses: any[]): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Expenses Report');
  ws.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Amount (TZS)', key: 'amount', width: 15 },
    { header: 'Payment Method', key: 'payment', width: 15 },
    { header: 'Receipt Number', key: 'receipt', width: 20 },
  ];
  Object.assign(ws.getRow(1), headerStyle);
  expenses.forEach(e => ws.addRow({
    date: new Date(e.date).toLocaleDateString(),
    category: e.category,
    description: e.description || '',
    amount: e.amount,
    payment: e.paymentMethod || '',
    receipt: e.receiptNumber || '',
  }));
  ws.getColumn('amount').numFmt = '#,##0';
  return wb.xlsx.writeBuffer() as Promise<Buffer>;
};
