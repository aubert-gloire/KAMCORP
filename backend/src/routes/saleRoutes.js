import express from 'express';
import { 
  getSales, 
  getSale, 
  createSale, 
  updatePaymentStatus,
  updateSale,
  deleteSale
} from '../controllers/saleController.js';
import { verifyToken, checkRole, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes accessible by all authenticated users (read)
router.get('/', asyncHandler(getSales));
router.get('/:id', asyncHandler(getSale));

// Routes for admin and sales manager only (write)
router.post('/', checkRole(['admin', 'sales']), asyncHandler(createSale));
router.patch('/:id/payment-status', checkRole(['admin', 'sales']), asyncHandler(updatePaymentStatus));
router.put('/:id', checkRole(['admin', 'sales']), asyncHandler(updateSale));
router.delete('/:id', checkRole(['admin', 'sales']), asyncHandler(deleteSale));

export default router;
