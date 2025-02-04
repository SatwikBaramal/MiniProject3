import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
  Chip,
  TextField,
  Snackbar
} from '@mui/material';
import {
  SupervisorAccount,
  Group,
  Home,
  Check,
  Close,
  AccessTime,
  Person,
  WorkOutline,
  Assignment
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const ManagerDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [wfhRequests, setWfhRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data...');
        await fetchEmployees();
        await fetchTasks();
        await fetchWfhRequests();
        await fetchAssignedTasks();
        console.log('Data fetched successfully');
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/manager/employees', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchAttendanceRecords = async (employeeId) => {
    try {
      const response = await axios.get(`/api/manager/attendance/${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAttendanceRecords(response.data);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  };

  const fetchWfhRequests = async () => {
    try {
      console.log('Fetching WFH requests...');
      const response = await axios.get('/api/wfh/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('WFH requests:', response.data);
      setWfhRequests(response.data);
    } catch (error) {
      console.error('Error fetching WFH requests:', error);
    }
  };

  const fetchAssignedTasks = async () => {
    try {
      const response = await axios.get('/api/tasks/assigned', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignedTasks(response.data);
    } catch (error) {
      console.error('Error fetching assigned tasks:', error);
    }
  };

  const handleEmployeeChange = (event) => {
    const employeeId = event.target.value;
    setSelectedEmployee(employeeId);
    if (employeeId) {
      fetchAttendanceRecords(employeeId);
    } else {
      setAttendanceRecords([]);
    }
  };

  const handleTaskChange = (event) => {
    setSelectedTask(event.target.value);
  };

  const handleWfhResponse = async (requestId, status) => {
    try {
      console.log('Responding to WFH request:', { requestId, status });
      
      const response = await axios.post(
        `/api/wfh/respond/${requestId}`,
        { status },
        { 
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Response:', response.data);
      
      if (response.data.success) {
        alert(`WFH request ${status.toLowerCase()} successfully`);
        fetchWfhRequests();
      } else {
        alert(response.data.message || 'Failed to process WFH request');
      }
    } catch (error) {
      console.error('Error responding to WFH request:', error.response?.data || error);
      alert(error.response?.data?.message || 'Error processing WFH request');
    }
  };

  const handleTaskAssignment = async () => {
    if (!taskTitle || !selectedEmployee) {
      alert('Please enter a task title and select an employee');
      return;
    }

    try {
      const taskResponse = await axios.post('/api/tasks', {
        title: taskTitle,
        description: taskDescription
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const taskId = taskResponse.data._id;

      await axios.post('/api/tasks/assign', {
        taskId,
        employeeId: selectedEmployee
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setOpenSnackbar(true);
      setTaskTitle('');
      setTaskDescription('');
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Failed to assign task');
    }
  };

  const handleReviewTask = (taskId) => {
    window.open(`/task-review/${taskId}`, '_blank');
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mt: 4, mb: 3 }} display="flex" alignItems="center">
        <SupervisorAccount sx={{ mr: 2 }} />
        Manager Dashboard - {user.name}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
                <Group sx={{ mr: 1 }} color="primary" />
                Employee Attendance Records
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={selectedEmployee}
                  onChange={handleEmployeeChange}
                  startAdornment={<Person sx={{ mr: 1 }} />}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {employees.map((employee) => (
                    <MenuItem key={employee._id} value={employee._id}>
                      {employee.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {selectedEmployee && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Entry Time</TableCell>
                      <TableCell>Exit Time</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {record.entryTime ? new Date(record.entryTime).toLocaleTimeString() : '-'}
                        </TableCell>
                        <TableCell>
                          {record.exitTime ? new Date(record.exitTime).toLocaleTimeString() : '-'}
                        </TableCell>
                        <TableCell>{record.totalDuration || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={record.status}
                            color={record.status === 'Present' ? 'success' : 'error'}
                            icon={record.status === 'Present' ? <Check /> : <Close />}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
              <Home sx={{ mr: 1 }} color="primary" />
              Work From Home Requests
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wfhRequests.map((request) => (
                    <TableRow key={request._id}>
                      <TableCell>{request.employeeName}</TableCell>
                      <TableCell>{new Date(request.date).toLocaleDateString()}</TableCell>
                      <TableCell>{request.reason}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={request.status}
                          color={
                            request.status === 'Approved'
                              ? 'success'
                              : request.status === 'Pending'
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {request.status === 'Pending' && (
                          <Box>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleWfhResponse(request._id, 'Approved')}
                              startIcon={<Check />}
                              sx={{ mr: 1 }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleWfhResponse(request._id, 'Rejected')}
                              startIcon={<Close />}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
              <WorkOutline sx={{ mr: 1 }} color="primary" />
              Assigned Tasks Status
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Task</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Completed On</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignedTasks.map((task) => (
                    <TableRow key={task._id}>
                      <TableCell>{task.employeeId.name}</TableCell>
                      <TableCell>{task.taskId.title}</TableCell>
                      <TableCell>{task.taskId.description}</TableCell>
                      <TableCell>
                        <Chip
                          label={task.status}
                          color={task.status === 'completed' ? 'success' : 'warning'}
                        />
                      </TableCell>
                      <TableCell>
                        {task.completedDate 
                          ? new Date(task.completedDate).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {task.status === 'pending_review' && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => handleReviewTask(task.taskId._id)}
                            startIcon={<Assignment />}
                          >
                            Review
                          </Button>
                        )}
                        {task.status === 'approved' && (
                          <Chip
                            label="Approved"
                            color="success"
                            icon={<Check />}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} display="flex" alignItems="center">
              <Group sx={{ mr: 1 }} color="primary" />
              Task Assignment
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Task Title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                fullWidth
              />
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                label="Task Description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                fullWidth
                multiline
                rows={4}
              />
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Employee</InputLabel>
              <Select
                value={selectedEmployee}
                onChange={handleEmployeeChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {employee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" color="primary" onClick={handleTaskAssignment}>
              Assign Task
            </Button>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message="Task Assigned Successfully"
      />
    </Container>
  );
};

export default ManagerDashboard;
