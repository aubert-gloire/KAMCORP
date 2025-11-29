import PDFDocument from 'pdfkit';

/**
 * Generate PDF for Sales Report
 */
export const generateSalesPDF = (sales, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(dateRange || 'All Time', { align: 'center' });
      doc.moveDown(1.5);

      // Summary Box
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalPriceTZS || 0), 0);
      const totalQuantity = sales.reduce((sum, sale) => sum + (sale.quantitySold || 0), 0);
      
      doc.rect(50, doc.y, 495, 70).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#000000');
      
      doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
      doc.fontSize(11).font('Helvetica')
        .text(`Total Sales: ${sales.length}`, 60, doc.y + 10)
        .text(`Total Revenue: TZS ${totalRevenue.toLocaleString()}`, 60, doc.y + 5)
        .text(`Total Items Sold: ${totalQuantity}`, 60, doc.y + 5);
      
      doc.moveDown(3);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      
      doc.rect(50, tableTop, 495, 25).fillAndStroke('#9333ea', '#9333ea');
      doc.fillColor('#ffffff');
      
      doc.text('#', 60, tableTop + 8, { width: 25 });
      doc.text('Date', 95, tableTop + 8, { width: 70 });
      doc.text('Product', 175, tableTop + 8, { width: 120 });
      doc.text('Qty', 305, tableTop + 8, { width: 40 });
      doc.text('Unit Price', 355, tableTop + 8, { width: 70 });
      doc.text('Total', 435, tableTop + 8, { width: 100, align: 'right' });
      
      doc.moveDown(1.5);

      // Table Rows
      let yPosition = doc.y;
      doc.fillColor('#000000').font('Helvetica');
      
      sales.forEach((sale, index) => {
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          
          // Redraw header on new page
          doc.fontSize(10).font('Helvetica-Bold');
          doc.rect(50, yPosition, 495, 25).fillAndStroke('#9333ea', '#9333ea');
          doc.fillColor('#ffffff');
          doc.text('#', 60, yPosition + 8, { width: 25 });
          doc.text('Date', 95, yPosition + 8, { width: 70 });
          doc.text('Product', 175, yPosition + 8, { width: 120 });
          doc.text('Qty', 305, yPosition + 8, { width: 40 });
          doc.text('Unit Price', 355, yPosition + 8, { width: 70 });
          doc.text('Total', 435, yPosition + 8, { width: 100, align: 'right' });
          yPosition += 30;
          doc.fillColor('#000000').font('Helvetica');
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(50, yPosition - 5, 495, 25).fill('#f9fafb');
        }

        doc.fontSize(9);
        doc.fillColor('#000000');
        doc.text(`${index + 1}`, 60, yPosition, { width: 25 });
        doc.text(new Date(sale.date).toLocaleDateString(), 95, yPosition, { width: 70 });
        
        const productName = sale.productSnapshot?.name || sale.productId?.name || 'N/A';
        const truncatedName = productName.length > 20 ? productName.substring(0, 17) + '...' : productName;
        doc.text(truncatedName, 175, yPosition, { width: 120 });
        
        doc.text((sale.quantitySold || 0).toString(), 305, yPosition, { width: 40 });
        doc.text((sale.unitPriceAtSaleTZS || 0).toLocaleString(), 355, yPosition, { width: 70 });
        doc.text((sale.totalPriceTZS || 0).toLocaleString(), 435, yPosition, { width: 100, align: 'right' });
        
        yPosition += 25;
      });

      // Footer
      const bottomY = 750;
      doc.fontSize(8).fillColor('#6b7280').text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        50,
        bottomY,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF for Purchases Report
 */
export const generatePurchasesPDF = (purchases, dateRange) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Purchases Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(dateRange || 'All Time', { align: 'center' });
      doc.moveDown(1.5);

      // Summary Box
      const totalCost = purchases.reduce((sum, p) => sum + (p.totalCostTZS || 0), 0);
      const totalQuantity = purchases.reduce((sum, p) => sum + (p.quantityPurchased || 0), 0);
      
      doc.rect(50, doc.y, 495, 70).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#000000');
      
      doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
      doc.fontSize(11).font('Helvetica')
        .text(`Total Purchases: ${purchases.length}`, 60, doc.y + 10)
        .text(`Total Cost: TZS ${totalCost.toLocaleString()}`, 60, doc.y + 5)
        .text(`Total Items Purchased: ${totalQuantity}`, 60, doc.y + 5);
      
      doc.moveDown(3);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      
      doc.rect(50, tableTop, 495, 25).fillAndStroke('#9333ea', '#9333ea');
      doc.fillColor('#ffffff');
      
      doc.text('#', 60, tableTop + 8, { width: 25 });
      doc.text('Date', 95, tableTop + 8, { width: 70 });
      doc.text('Product', 175, tableTop + 8, { width: 110 });
      doc.text('Supplier', 295, tableTop + 8, { width: 80 });
      doc.text('Qty', 385, tableTop + 8, { width: 40 });
      doc.text('Total Cost', 435, tableTop + 8, { width: 100, align: 'right' });
      
      doc.moveDown(1.5);

      // Table Rows
      let yPosition = doc.y;
      doc.fillColor('#000000').font('Helvetica');
      
      purchases.forEach((purchase, index) => {
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          
          // Redraw header on new page
          doc.fontSize(10).font('Helvetica-Bold');
          doc.rect(50, yPosition, 495, 25).fillAndStroke('#9333ea', '#9333ea');
          doc.fillColor('#ffffff');
          doc.text('#', 60, yPosition + 8, { width: 25 });
          doc.text('Date', 95, yPosition + 8, { width: 70 });
          doc.text('Product', 175, yPosition + 8, { width: 110 });
          doc.text('Supplier', 295, yPosition + 8, { width: 80 });
          doc.text('Qty', 385, yPosition + 8, { width: 40 });
          doc.text('Total Cost', 435, yPosition + 8, { width: 100, align: 'right' });
          yPosition += 30;
          doc.fillColor('#000000').font('Helvetica');
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(50, yPosition - 5, 495, 25).fill('#f9fafb');
        }

        doc.fontSize(9);
        doc.fillColor('#000000');
        doc.text(`${index + 1}`, 60, yPosition, { width: 25 });
        doc.text(new Date(purchase.date).toLocaleDateString(), 95, yPosition, { width: 70 });
        
        const productName = purchase.productId?.name || 'N/A';
        const truncatedName = productName.length > 18 ? productName.substring(0, 15) + '...' : productName;
        doc.text(truncatedName, 175, yPosition, { width: 110 });
        
        const supplier = purchase.supplierText || 'N/A';
        const truncatedSupplier = supplier.length > 13 ? supplier.substring(0, 10) + '...' : supplier;
        doc.text(truncatedSupplier, 295, yPosition, { width: 80 });
        
        doc.text((purchase.quantityPurchased || 0).toString(), 385, yPosition, { width: 40 });
        doc.text((purchase.totalCostTZS || 0).toLocaleString(), 435, yPosition, { width: 100, align: 'right' });
        
        yPosition += 25;
      });

      // Footer
      const bottomY = 750;
      doc.fontSize(8).fillColor('#6b7280').text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        50,
        bottomY,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF for Stock Report
 */
export const generateStockPDF = (products) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Stock Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(new Date().toLocaleDateString(), { align: 'center' });
      doc.moveDown(1.5);

      // Summary Box
      const totalValue = products.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.unitPriceTZS || 0)), 0);
      const lowStockItems = products.filter(p => (p.stockQuantity || 0) <= 5).length;
      const outOfStockItems = products.filter(p => (p.stockQuantity || 0) === 0).length;
      
      doc.rect(50, doc.y, 495, 85).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#000000');
      
      doc.fontSize(12).font('Helvetica-Bold').text('Summary', 60, doc.y + 15);
      doc.fontSize(11).font('Helvetica')
        .text(`Total Products: ${products.length}`, 60, doc.y + 10)
        .text(`Total Stock Value: TZS ${totalValue.toLocaleString()}`, 60, doc.y + 5)
        .text(`Low Stock Items: ${lowStockItems}`, 60, doc.y + 5)
        .text(`Out of Stock: ${outOfStockItems}`, 60, doc.y + 5);
      
      doc.moveDown(3.5);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      
      doc.rect(50, tableTop, 495, 25).fillAndStroke('#9333ea', '#9333ea');
      doc.fillColor('#ffffff');
      
      doc.text('#', 60, tableTop + 8, { width: 25 });
      doc.text('Product', 95, tableTop + 8, { width: 130 });
      doc.text('Category', 235, tableTop + 8, { width: 80 });
      doc.text('SKU', 325, tableTop + 8, { width: 60 });
      doc.text('Qty', 395, tableTop + 8, { width: 40 });
      doc.text('Status', 445, tableTop + 8, { width: 90, align: 'center' });
      
      doc.moveDown(1.5);

      // Table Rows
      let yPosition = doc.y;
      doc.fillColor('#000000').font('Helvetica');
      
      products.forEach((product, index) => {
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          
          // Redraw header on new page
          doc.fontSize(10).font('Helvetica-Bold');
          doc.rect(50, yPosition, 495, 25).fillAndStroke('#9333ea', '#9333ea');
          doc.fillColor('#ffffff');
          doc.text('#', 60, yPosition + 8, { width: 25 });
          doc.text('Product', 95, yPosition + 8, { width: 130 });
          doc.text('Category', 235, yPosition + 8, { width: 80 });
          doc.text('SKU', 325, yPosition + 8, { width: 60 });
          doc.text('Qty', 395, yPosition + 8, { width: 40 });
          doc.text('Status', 445, yPosition + 8, { width: 90, align: 'center' });
          yPosition += 30;
          doc.fillColor('#000000').font('Helvetica');
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(50, yPosition - 5, 495, 25).fill('#f9fafb');
        }

        doc.fontSize(9);
        doc.fillColor('#000000');
        doc.text(`${index + 1}`, 60, yPosition, { width: 25 });
        
        const name = (product.name || 'N/A');
        const truncatedName = name.length > 22 ? name.substring(0, 19) + '...' : name;
        doc.text(truncatedName, 95, yPosition, { width: 130 });
        
        const category = (product.category || 'N/A');
        const truncatedCategory = category.length > 13 ? category.substring(0, 10) + '...' : category;
        doc.text(truncatedCategory, 235, yPosition, { width: 80 });
        
        doc.text(product.sku || 'N/A', 325, yPosition, { width: 60 });
        doc.text((product.stockQuantity || 0).toString(), 395, yPosition, { width: 40 });
        
        const qty = product.stockQuantity || 0;
        let status, statusColor;
        if (qty === 0) {
          status = 'Out of Stock';
          statusColor = '#dc2626';
        } else if (qty <= 5) {
          status = 'Low Stock';
          statusColor = '#f59e0b';
        } else {
          status = 'In Stock';
          statusColor = '#16a34a';
        }
        
        doc.fillColor(statusColor).text(status, 445, yPosition, { width: 90, align: 'center' });
        doc.fillColor('#000000');
        
        yPosition += 25;
      });

      // Footer
      const bottomY = 750;
      doc.fontSize(8).fillColor('#6b7280').text(
        `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        50,
        bottomY,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
