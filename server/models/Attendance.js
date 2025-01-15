const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number],
    required: true,
    default: [0, 0]
  }
});

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  entryTime: {
    type: Date,
    required: true
  },
  exitTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'partial'],
    default: 'absent'
  },
  location: {
    type: pointSchema,
    required: true,
    default: () => ({
      type: 'Point',
      coordinates: [0, 0]
    })
  },
  exitLocation: {
    type: pointSchema,
    required: true,
    default: () => ({
      type: 'Point',
      coordinates: [0, 0]
    })
  },
  totalDuration: {
    type: Number,  // Duration in minutes
    default: 0
  },
  isWFH: {
    type: Boolean,
    default: false
  },
  autoEntry: {
    type: Boolean,
    default: false
  },
  autoExit: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create geospatial indexes
attendanceSchema.index({ location: '2dsphere' });
attendanceSchema.index({ exitLocation: '2dsphere' });

module.exports = mongoose.model('Attendance', attendanceSchema);
