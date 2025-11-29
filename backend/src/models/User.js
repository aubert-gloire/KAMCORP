import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: ['admin', 'sales', 'stock'],
    required: [true, 'Role is required']
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries (email already indexed via unique: true)
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;
