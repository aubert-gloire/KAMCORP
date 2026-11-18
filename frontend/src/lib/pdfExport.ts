import PDFDocument from 'pdfkit';

const makePDF = (builder: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try { builder(doc); } catch (e) { reject(e); }
  });

const drawTableHeader = (doc: any, top: number, columns: { text: string; x: number; width: number }[]) => {
  doc.rect(50, top, 495, 25).fillAndStroke('#9333ea', '#9333ea');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  columns.forEach(col => doc.text(col.text, col.x, top + 8, { width: col.width }));
  doc.fillColor('#000000').font('Helvetica');
};

export const generateSalesPDF = (sales: any[], dateRange: string): Promise<Buffer> =>
  makePDF(doc => {
    doc.fontSize(24).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
    doc.moveDown(0.5).fontSize(11).font('Helvetica').text(dateRange || 'All Time', { align: 'center' });
    doc.moveDown(1.5);

    const totalRevenue = sales.reduce((s, x) => s + (x.totalPriceTZS || 0), 0);
    doc.rect(50, doc.y, 495, 70).fillAndStroke('#f3f4f6', '#d1d5db').fillColor('#000000');
    doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
    doc.fontSize(11).font('Helvetica')
      .text(`Total Sales: ${sales.length}`, 60, doc.y + 10)
      .text(`Total Revenue: TZS ${totalRevenue.toLocaleString()}`, 60, doc.y + 5)
      .text(`Total Items Sold: ${sales.reduce((s, x) => s + (x.quantitySold || 0), 0)}`, 60, doc.y + 5);
    doc.moveDown(3);

    const cols = [
      { text: '#', x: 60, width: 25 }, { text: 'Date', x: 95, width: 70 },
      { text: 'Product', x: 175, width: 120 }, { text: 'Qty', x: 305, width: 40 },
      { text: 'Unit Price', x: 355, width: 70 }, { text: 'Total', x: 435, width: 100 },
    ];
    drawTableHeader(doc, doc.y, cols);
    doc.moveDown(1.5);

    let y = doc.y;
    sales.forEach((sale, i) => {
      if (y > 700) { doc.addPage(); y = 50; drawTableHeader(doc, y, cols); y += 30; }
      if (i % 2 === 0) doc.rect(50, y - 5, 495, 25).fill('#f9fafb');
      doc.fontSize(9).fillColor('#000000');
      doc.text(`${i + 1}`, 60, y, { width: 25 });
      doc.text(new Date(sale.date).toLocaleDateString(), 95, y, { width: 70 });
      const name = (sale.productSnapshot?.name || 'N/A').substring(0, 20);
      doc.text(name, 175, y, { width: 120 });
      doc.text(String(sale.quantitySold || 0), 305, y, { width: 40 });
      doc.text((sale.unitPriceAtSaleTZS || 0).toLocaleString(), 355, y, { width: 70 });
      doc.text((sale.totalPriceTZS || 0).toLocaleString(), 435, y, { width: 100, align: 'right' });
      y += 25;
    });
    doc.fontSize(8).fillColor('#6b7280').text(`Generated on ${new Date().toLocaleString()}`, 50, 750, { align: 'center' });
    doc.end();
  });

export const generatePurchasesPDF = (purchases: any[], dateRange: string): Promise<Buffer> =>
  makePDF(doc => {
    doc.fontSize(24).font('Helvetica-Bold').text('Purchases Report', { align: 'center' });
    doc.moveDown(0.5).fontSize(11).font('Helvetica').text(dateRange || 'All Time', { align: 'center' });
    doc.moveDown(1.5);

    const totalCost = purchases.reduce((s, x) => s + (x.totalCostTZS || 0), 0);
    doc.rect(50, doc.y, 495, 70).fillAndStroke('#f3f4f6', '#d1d5db').fillColor('#000000');
    doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
    doc.fontSize(11).font('Helvetica')
      .text(`Total Purchases: ${purchases.length}`, 60, doc.y + 10)
      .text(`Total Cost: TZS ${totalCost.toLocaleString()}`, 60, doc.y + 5);
    doc.moveDown(3);

    const cols = [
      { text: '#', x: 60, width: 25 }, { text: 'Date', x: 95, width: 70 },
      { text: 'Product', x: 175, width: 110 }, { text: 'Supplier', x: 295, width: 80 },
      { text: 'Qty', x: 385, width: 40 }, { text: 'Total Cost', x: 435, width: 100 },
    ];
    drawTableHeader(doc, doc.y, cols);
    doc.moveDown(1.5);

    let y = doc.y;
    purchases.forEach((p, i) => {
      if (y > 700) { doc.addPage(); y = 50; drawTableHeader(doc, y, cols); y += 30; }
      if (i % 2 === 0) doc.rect(50, y - 5, 495, 25).fill('#f9fafb');
      doc.fontSize(9).fillColor('#000000');
      doc.text(`${i + 1}`, 60, y, { width: 25 });
      doc.text(new Date(p.date).toLocaleDateString(), 95, y, { width: 70 });
      doc.text((p.productId?.name || 'N/A').substring(0, 18), 175, y, { width: 110 });
      doc.text((p.supplierText || 'N/A').substring(0, 13), 295, y, { width: 80 });
      doc.text(String(p.quantityPurchased || 0), 385, y, { width: 40 });
      doc.text((p.totalCostTZS || 0).toLocaleString(), 435, y, { width: 100, align: 'right' });
      y += 25;
    });
    doc.fontSize(8).fillColor('#6b7280').text(`Generated on ${new Date().toLocaleString()}`, 50, 750, { align: 'center' });
    doc.end();
  });

export const generateStockPDF = (products: any[]): Promise<Buffer> =>
  makePDF(doc => {
    doc.fontSize(24).font('Helvetica-Bold').text('Stock Report', { align: 'center' });
    doc.moveDown(0.5).fontSize(11).font('Helvetica').text(new Date().toLocaleDateString(), { align: 'center' });
    doc.moveDown(1.5);

    doc.rect(50, doc.y, 495, 85).fillAndStroke('#f3f4f6', '#d1d5db').fillColor('#000000');
    doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
    doc.fontSize(11).font('Helvetica')
      .text(`Total Products: ${products.length}`, 60, doc.y + 10)
      .text(`Low Stock: ${products.filter(p => p.stockQuantity <= 5 && p.stockQuantity > 0).length}`, 60, doc.y + 5)
      .text(`Out of Stock: ${products.filter(p => p.stockQuantity === 0).length}`, 60, doc.y + 5);
    doc.moveDown(3.5);

    const cols = [
      { text: '#', x: 60, width: 25 }, { text: 'Product', x: 95, width: 130 },
      { text: 'Category', x: 235, width: 80 }, { text: 'SKU', x: 325, width: 60 },
      { text: 'Qty', x: 395, width: 40 }, { text: 'Status', x: 445, width: 90 },
    ];
    drawTableHeader(doc, doc.y, cols);
    doc.moveDown(1.5);

    let y = doc.y;
    products.forEach((p, i) => {
      if (y > 700) { doc.addPage(); y = 50; drawTableHeader(doc, y, cols); y += 30; }
      if (i % 2 === 0) doc.rect(50, y - 5, 495, 25).fill('#f9fafb');
      doc.fontSize(9).fillColor('#000000');
      doc.text(`${i + 1}`, 60, y, { width: 25 });
      doc.text((p.name || 'N/A').substring(0, 22), 95, y, { width: 130 });
      doc.text((p.category || 'N/A').substring(0, 13), 235, y, { width: 80 });
      doc.text(p.sku || 'N/A', 325, y, { width: 60 });
      doc.text(String(p.stockQuantity || 0), 395, y, { width: 40 });
      const qty = p.stockQuantity || 0;
      const color = qty === 0 ? '#dc2626' : qty <= 5 ? '#f59e0b' : '#16a34a';
      const status = qty === 0 ? 'Out of Stock' : qty <= 5 ? 'Low Stock' : 'In Stock';
      doc.fillColor(color).text(status, 445, y, { width: 90, align: 'center' });
      doc.fillColor('#000000');
      y += 25;
    });
    doc.fontSize(8).fillColor('#6b7280').text(`Generated on ${new Date().toLocaleString()}`, 50, 750, { align: 'center' });
    doc.end();
  });
