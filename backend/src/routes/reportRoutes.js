import express from 'express';
import { 
  getSalesReport, 
  getStockReport, 
  getPurchasesReport,
  getExpensesReport,
  getDashboardSummary,
  exportSalesCSV,
  exportPurchasesCSV,
  exportStockCSV,
  exportExpensesCSV,
  exportSalesPDF,
  exportPurchasesPDF,
  exportStockPDF,
  exportExpensesPDF,
  exportSalesExcel,
  exportPurchasesExcel,
  exportStockExcel,
  exportExpensesExcel
} from '../controllers/reportController.js';
import { verifyToken, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// All authenticated users can access reports
router.get('/sales', asyncHandler(getSalesReport));
router.get('/stock', asyncHandler(getStockReport));
router.get('/purchases', asyncHandler(getPurchasesReport));
router.get('/expenses', asyncHandler(getExpensesReport));
router.get('/dashboard', asyncHandler(getDashboardSummary));

// CSV Export routes
router.get('/sales/export', asyncHandler(exportSalesCSV));
router.get('/purchases/export', asyncHandler(exportPurchasesCSV));
router.get('/stock/export', asyncHandler(exportStockCSV));
router.get('/expenses/export', asyncHandler(exportExpensesCSV));

// PDF Export routes
router.get('/sales/export/pdf', asyncHandler(exportSalesPDF));
router.get('/purchases/export/pdf', asyncHandler(exportPurchasesPDF));
router.get('/stock/export/pdf', asyncHandler(exportStockPDF));
router.get('/expenses/export/pdf', asyncHandler(exportExpensesPDF));

// Excel Export routes
router.get('/sales/export/xlsx', asyncHandler(exportSalesExcel));
router.get('/purchases/export/xlsx', asyncHandler(exportPurchasesExcel));
router.get('/stock/export/xlsx', asyncHandler(exportStockExcel));
router.get('/expenses/export/xlsx', asyncHandler(exportExpensesExcel));

export default router;
