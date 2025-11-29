import express from 'express';
import { 
  getPurchases, 
  getPurchase, 
  createPurchase,
  getSuppliers,
  updatePurchase,
  deletePurchase
} from '../controllers/purchaseController.js';
import { verifyToken, checkRole, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes accessible by all authenticated users (read)
router.get('/', asyncHandler(getPurchases));
router.get('/suppliers', asyncHandler(getSuppliers));
router.get('/:id', asyncHandler(getPurchase));

// Routes for admin and stock manager only (write)
router.post('/', checkRole(['admin', 'stock']), asyncHandler(createPurchase));
router.put('/:id', checkRole(['admin', 'stock']), asyncHandler(updatePurchase));
router.delete('/:id', checkRole(['admin', 'stock']), asyncHandler(deletePurchase));

export default router;
