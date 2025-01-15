import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip
} from '@mui/material';
import { 
  LocationOn, 
  AccessTime, 
  WorkOutline, 
  Check, 
  Close,
  History,
  Home
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

const EmployeeDashboard = () => {
  const [location, setLocation] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isInOffice, setIsInOffice] = useState(false);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [openWfhDialog, setOpenWfhDialog] = useState(false);
  const [wfhDate, setWfhDate] = useState('');
  const [wfhReason, setWfhReason] = useState('');
  const [hasApprovedWfh, setHasApprovedWfh] = useState(false);
  const { user } = useAuth();

  const officeLocation = {
    lat: 13.133750,
    lng: 77.568028,
    radius: 200
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  };

  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      try {
        const response = await axios.get('/api/attendance/history', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setAttendanceHistory(response.data);
        const today = response.data.find(record => 
          new Date(record.date).toDateString() === new Date().toDateString()
        );
        setTodayAttendance(today);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };

    fetchAttendanceHistory();
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          
          // Calculate distance from office
          const distance = calculateDistance(
            newLocation.lat,
            newLocation.lng,
            officeLocation.lat,
            officeLocation.lng
          );
          setIsInOffice(distance <= officeLocation.radius);
        },
        (err) => {
          console.error(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    const fetchWfhRequests = async () => {
      try {
        const response = await axios.get('/api/wfh/requests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setWfhRequests(response.data);
      } catch (error) {
        console.error('Error fetching WFH requests:', error);
      }
    };

    fetchWfhRequests();
  }, []);

  useEffect(() => {
    const checkWfhStatus = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get('/api/wfh/requests', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const approvedWfh = response.data.some(
          request => 
            new Date(request.date).toISOString().split('T')[0] === today && 
            request.status === 'Approved'
        );
        setHasApprovedWfh(approvedWfh);
      } catch (error) {
        console.error('Error checking WFH status:', error);
      }
    };

    checkWfhStatus();
  }, []);

  const handleEntry = async () => {
    if (!location && !hasApprovedWfh) {
      alert('Location access is required. Please enable location services.');
      return;
    }

    try {
      const response = await axios.post(
        '/api/attendance/entry',
        {
          latitude: location?.lat,
          longitude: location?.lng
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setTodayAttendance(response.data.attendance);
        if (Notification.permission === 'granted') {
          new Notification('Attendance Marked', {
            body: 'Your attendance has been marked successfully.'
          });
        }
      }
    } catch (error) {
      console.error('Error marking entry:', error);
      const errorMessage = error.response?.data?.message || 'Failed to mark attendance';
      alert(errorMessage);
    }
  };

  const handleExit = async () => {
    if (!location && !hasApprovedWfh) {
      alert('Location access is required. Please enable location services.');
      return;
    }

    try {
      const response = await axios.post(
        '/api/attendance/exit',
        {
          latitude: location?.lat,
          longitude: location?.lng
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setTodayAttendance(response.data.attendance);
        if (Notification.permission === 'granted') {
          new Notification('Exit Marked', {
            body: 'Your exit has been marked successfully.'
          });
        }
      }
    } catch (error) {
      console.error('Error marking exit:', error);
      const errorMessage = error.response?.data?.message || 'Failed to mark exit';
      alert(errorMessage);
    }
  };

  const handleWfhRequest = async () => {
    try {
      await axios.post('/api/wfh/request', 
        { date: wfhDate, reason: wfhReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setOpenWfhDialog(false);
      setWfhDate('');
      setWfhReason('');
      // Refresh WFH requests
      const response = await axios.get('/api/wfh/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWfhRequests(response.data);
    } catch (error) {
      console.error('Error submitting WFH request:', error);
    }
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mt: 4, mb: 3 }} display="flex" alignItems="center">
        <WorkOutline sx={{ mr: 2 }} />
        Employee Dashboard - {user.name}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
              <LocationOn sx={{ mr: 1 }} color="primary" />
              Current Location Status
            </Typography>
            {location ? (
              <Box>
                <Chip
                  icon={isInOffice ? <Check /> : <Close />}
                  label={isInOffice ? 'In Office' : 'Outside Office'}
                  color={isInOffice ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                />
                <div style={{ height: '300px', width: '100%' }}>
                  <MapContainer
                    center={[location.lat, location.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Circle
                      center={[officeLocation.lat, officeLocation.lng]}
                      radius={officeLocation.radius}
                      pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                    >
                      <Popup>Office Premises</Popup>
                    </Circle>
                    <Circle
                      center={[location.lat, location.lng]}
                      radius={10}
                      pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.7 }}
                    >
                      <Popup>Your Location</Popup>
                    </Circle>
                  </MapContainer>
                </div>
              </Box>
            ) : (
              <Typography color="text.secondary">Loading location...</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
              <AccessTime sx={{ mr: 1 }} color="primary" />
              Today's Attendance
            </Typography>
            {todayAttendance && todayAttendance.entryTime ? (
              <Box>
                <Chip
                  icon={<Check />}
                  label={`Present${todayAttendance.isWFH ? ' (WFH)' : ''}`}
                  color="success"
                  sx={{ mb: 2 }}
                />
                <Typography variant="body1">
                  Entry Time: {new Date(todayAttendance.entryTime).toLocaleTimeString()}
                </Typography>
                {todayAttendance.exitTime ? (
                  <Typography variant="body1">
                    Exit Time: {new Date(todayAttendance.exitTime).toLocaleTimeString()}
                  </Typography>
                ) : (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleExit}
                    disabled={!isInOffice && !hasApprovedWfh}
                    startIcon={<Close />}
                    sx={{ mt: 2 }}
                  >
                    Mark Exit {hasApprovedWfh ? '(WFH)' : ''}
                  </Button>
                )}
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Duration: {todayAttendance.totalDuration ? `${todayAttendance.totalDuration} minutes` : '-'}
                </Typography>
                <Typography variant="body1">
                  Status: {todayAttendance.status}
                </Typography>
              </Box>
            ) : (
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleEntry}
                  disabled={!isInOffice && !hasApprovedWfh}
                  startIcon={<Check />}
                >
                  Mark Entry {hasApprovedWfh ? '(WFH)' : ''}
                </Button>
                {!isInOffice && !hasApprovedWfh && (
                  <Typography color="error" sx={{ mt: 2 }}>
                    You must be within office premises to mark attendance
                  </Typography>
                )}
              </Box>
            )}
            {hasApprovedWfh && (
              <Typography color="primary" sx={{ mt: 2 }}>
                WFH Approved - You can mark attendance from any location
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
              <History sx={{ mr: 1 }} color="primary" />
              Attendance History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Entry Time</TableCell>
                    <TableCell>Exit Time</TableCell>
                    <TableCell>Duration (mins)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceHistory.map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {record.entryTime
                          ? new Date(record.entryTime).toLocaleTimeString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.exitTime
                          ? new Date(record.exitTime).toLocaleTimeString()
                          : '-'}
                      </TableCell>
                      <TableCell>{record.totalDuration || '-'}</TableCell>
                      <TableCell>{record.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" display="flex" alignItems="center">
                <Home sx={{ mr: 1 }} color="primary" />
                Work From Home Requests
              </Typography>
              <Button
                variant="contained"
                onClick={() => setOpenWfhDialog(true)}
                startIcon={<Home />}
              >
                New WFH Request
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wfhRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>{new Date(request.date).toLocaleDateString()}</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>{request.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={openWfhDialog} onClose={() => setOpenWfhDialog(false)}>
        <DialogTitle>Request Work From Home</DialogTitle>
        <DialogContent>
          <TextField
            label="Date"
            type="date"
            value={wfhDate}
            onChange={(e) => setWfhDate(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            label="Reason"
            value={wfhReason}
            onChange={(e) => setWfhReason(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWfhDialog(false)}>Cancel</Button>
          <Button onClick={handleWfhRequest} color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeeDashboard;
