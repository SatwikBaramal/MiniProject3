const mongoose = require('mongoose');

const taskAssignmentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'pending_review', 'approved'],
    default: 'pending'
  },
  completedDate: {
    type: Date
  },
  approvedDate: {
    type: Date
  }
});

module.exports = mongoose.model('TaskAssignment', taskAssignmentSchema);
