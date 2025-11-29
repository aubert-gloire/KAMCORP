import express from 'express';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats,
} from '../controllers/expenseController.js';
import { verifyToken, checkRole, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Statistics - admin and sales only
router.get('/stats/summary', checkRole(['admin', 'sales']), asyncHandler(getExpenseStats));

// CRUD operations - admin and sales only
router.get('/', checkRole(['admin', 'sales']), asyncHandler(getExpenses));
router.get('/:id', checkRole(['admin', 'sales']), asyncHandler(getExpense));
router.post('/', checkRole(['admin', 'sales']), asyncHandler(createExpense));
router.put('/:id', checkRole(['admin', 'sales']), asyncHandler(updateExpense));
router.delete('/:id', checkRole(['admin']), asyncHandler(deleteExpense)); // Only admin can delete

export default router;
