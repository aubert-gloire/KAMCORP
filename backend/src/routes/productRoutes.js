import express from 'express';
import { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getCategories 
} from '../controllers/productController.js';
import { verifyToken, checkRole, asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes accessible by all authenticated users
router.get('/', asyncHandler(getProducts));
router.get('/categories', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getProduct));

// Routes for admin and stock manager only
router.post('/', checkRole(['admin', 'stock']), asyncHandler(createProduct));
router.put('/:id', checkRole(['admin', 'stock']), asyncHandler(updateProduct));
router.delete('/:id', checkRole(['admin', 'stock']), asyncHandler(deleteProduct));

export default router;
