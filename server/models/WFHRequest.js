const mongoose = require('mongoose');

const wfhRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Create index for faster queries
wfhRequestSchema.index({ userId: 1, date: 1 }, { unique: true });
wfhRequestSchema.index({ managerId: 1, status: 1 });

module.exports = mongoose.model('WFHRequest', wfhRequestSchema);
