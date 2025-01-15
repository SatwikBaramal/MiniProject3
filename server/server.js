const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Attendance = require('./models/Attendance');
const WFHRequest = require('./models/WFHRequest');
const { auth, isManager } = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/attendance-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Office location configuration
const officeLocation = {
  latitude: 13.133750,
  longitude: 77.568028,
  radius: 200  // radius in meters
};

// Constants
const MINIMUM_PRESENCE_TIME = 30; // 30 seconds for presence

// Function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, managerId } = req.body;
    const userData = { name, email, password, role };
    
    // Validate managerId for employees
    if (role === 'employee') {
      if (!managerId) {
        return res.status(400).json({ error: 'Manager ID is required for employees' });
      }
      
      // Check if managerId is a valid manager
      const manager = await User.findOne({ _id: managerId, role: 'manager' });
      if (!manager) {
        return res.status(400).json({ error: 'Invalid Manager ID. Please provide a valid Manager ID.' });
      }
      userData.managerId = managerId;
    }
    
    const user = new User(userData);
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.status(201).json({ user, token });
  } catch (error) {
    // Handle specific MongoDB validation errors
    if (error.name === 'CastError' && error.path === 'managerId') {
      return res.status(400).json({ error: 'Invalid Manager ID format' });
    }
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid login credentials');
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// WFH Routes
app.post('/api/wfh/request', auth, async (req, res) => {
  try {
    const { date, reason } = req.body;
    
    // Check if a request already exists for this date
    const existingRequest = await WFHRequest.findOne({
      userId: req.user._id,
      date: new Date(date)
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'A request already exists for this date'
      });
    }

    // Get user's manager
    const user = await User.findById(req.user._id);
    if (!user.managerId) {
      return res.status(400).json({
        success: false,
        message: 'No manager assigned'
      });
    }

    const wfhRequest = new WFHRequest({
      userId: req.user._id,
      managerId: user.managerId,
      date: new Date(date),
      reason
    });

    await wfhRequest.save();
    res.json({
      success: true,
      message: 'WFH request submitted successfully',
      request: wfhRequest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wfh/requests', auth, async (req, res) => {
  try {
    let requests;
    if (req.user.role === 'manager') {
      // Managers see requests from their employees with employee details
      requests = await WFHRequest.find({ managerId: req.user._id })
        .populate('userId', 'name email')
        .lean();

      // Add employee name to each request
      requests = requests.map(request => ({
        ...request,
        employeeName: request.userId ? request.userId.name : 'Unknown Employee'
      }));
    } else {
      // Employees see their own requests
      requests = await WFHRequest.find({ userId: req.user._id });
    }
    
    console.log('User role:', req.user.role);
    console.log('Requests found:', requests);
    
    res.json(requests);
  } catch (error) {
    console.error('Error fetching WFH requests:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wfh/respond/:requestId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Log request details
    console.log('User:', req.user);
    console.log('Request ID:', req.params.requestId);
    console.log('Status:', status);
    
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either Approved or Rejected'
      });
    }

    // Check if user is a manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can respond to WFH requests'
      });
    }

    const request = await WFHRequest.findById(req.params.requestId);
    console.log('Found request:', request);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this request'
      });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    request.status = status;
    request.respondedAt = new Date();
    await request.save();
    
    console.log('Updated request:', request);

    res.json({
      success: true,
      message: `WFH request ${status.toLowerCase()}`,
      request
    });
  } catch (error) {
    console.error('Error responding to WFH request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing WFH request',
      error: error.message 
    });
  }
});

// Attendance Routes
app.post('/api/attendance/entry', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // Check for approved WFH request
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wfhRequest = await WFHRequest.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      status: 'Approved'
    });

    // Check location if no WFH approval
    if (!wfhRequest) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Location data is required'
        });
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      if (distance > officeLocation.radius) {
        return res.status(400).json({
          success: false,
          message: 'You are outside office premises'
        });
      }
    }

    // Check for existing attendance
    const existingAttendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingAttendance && existingAttendance.entryTime) {
      return res.status(400).json({
        success: false,
        message: 'Entry time already recorded for today'
      });
    }

    // Create or update attendance record
    const attendance = existingAttendance || new Attendance({
      userId: req.user._id,
      date: today,
      isWFH: !!wfhRequest,
      entryTime: new Date(),
      status: 'partial',
      location: {
        type: 'Point',
        coordinates: latitude && longitude ? [longitude, latitude] : [0, 0]
      },
      exitLocation: {
        type: 'Point',
        coordinates: [0, 0]
      }
    });

    // Update location if provided
    if (latitude && longitude) {
      attendance.location = {
        type: 'Point',
        coordinates: [longitude, latitude]
      };
    }

    await attendance.save();

    res.json({
      success: true,
      message: `Entry time recorded successfully${wfhRequest ? ' (WFH)' : ''}`,
      attendance
    });
  } catch (error) {
    console.error('Entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/attendance/exit', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for approved WFH request
    const wfhRequest = await WFHRequest.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      },
      status: 'Approved'
    });

    // Check location if no WFH approval
    if (!wfhRequest) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Location data is required'
        });
      }

      const distance = calculateDistance(
        latitude,
        longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      if (distance > officeLocation.radius) {
        return res.status(400).json({
          success: false,
          message: 'You are outside office premises'
        });
      }
    }

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!attendance || !attendance.entryTime) {
      return res.status(400).json({
        success: false,
        message: 'No entry record found for today'
      });
    }

    if (attendance.exitTime) {
      return res.status(400).json({
        success: false,
        message: 'Exit time already recorded for today'
      });
    }

    attendance.exitTime = new Date();

    // Always set exit location, use provided coordinates or defaults
    attendance.exitLocation = {
      type: 'Point',
      coordinates: latitude && longitude ? [longitude, latitude] : [0, 0]
    };

    const durationInSeconds = Math.round((attendance.exitTime - attendance.entryTime) / 1000);
    attendance.totalDuration = Math.round(durationInSeconds / 60); // Convert to minutes
    attendance.status = durationInSeconds >= MINIMUM_PRESENCE_TIME ? 'present' : 'partial';

    await attendance.save();

    res.json({
      success: true,
      message: `Exit time recorded successfully${wfhRequest ? ' (WFH)' : ''}`,
      attendance
    });
  } catch (error) {
    console.error('Exit error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

app.get('/api/attendance/history', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.user._id })
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all managers
app.get('/api/managers', async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' }, '_id name email');
    res.json(managers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manager routes
app.get('/api/manager/employees', auth, isManager, async (req, res) => {
  try {
    const employees = await User.find({ managerId: req.user._id });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/manager/attendance/:employeeId', auth, isManager, async (req, res) => {
  try {
    const attendance = await Attendance.find({ userId: req.params.employeeId })
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
