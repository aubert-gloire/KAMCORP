/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      ok: false,
      error: errors.join(', ')
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      ok: false,
      error: `${field} already exists. Please use a different value.`
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      ok: false,
      error: 'Invalid ID format.'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      ok: false,
      error: 'Invalid token.'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      ok: false,
      error: 'Token expired.'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.message || 'Internal server error.'
  });
};

/**
 * 404 handler
 */
export const notFound = (req, res) => {
  res.status(404).json({
    ok: false,
    error: `Route ${req.originalUrl} not found.`
  });
};
