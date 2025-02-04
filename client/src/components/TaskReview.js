import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  Grid
} from '@mui/material';
import {
  Check,
  Person,
  Assignment
} from '@mui/icons-material';

const TaskReview = () => {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`/api/tasks/review/${taskId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setTask(response.data);
      } catch (error) {
        console.error('Error fetching task:', error);
      }
    };

    fetchTask();
  }, [taskId]);

  const handleApprove = async () => {
    try {
      await axios.post(`/api/tasks/approve/${taskId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Task approved successfully');
      window.close();
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Failed to approve task');
    }
  };

  if (!task) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <Typography variant="h4" sx={{ mt: 4, mb: 3 }} display="flex" alignItems="center">
        <Assignment sx={{ mr: 2 }} />
        Task Review
      </Typography>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="textSecondary">
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Employee Name
              </Typography>
              <Typography variant="h6">{task.employeeId.name}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="textSecondary">
                Task Title
              </Typography>
              <Typography variant="h6">{task.taskId.title}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="textSecondary">
                Task Description
              </Typography>
              <Typography>{task.taskId.description}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="textSecondary">
                Completion Date
              </Typography>
              <Typography>
                {new Date(task.completedDate).toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="textSecondary">
                Status
              </Typography>
              <Chip
                label={task.status}
                color={task.status === 'pending_review' ? 'warning' : 'success'}
                sx={{ mt: 1 }}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Check />}
              onClick={handleApprove}
              disabled={task.status === 'approved'}
            >
              {task.status === 'approved' ? 'Task Approved' : 'Approve Task'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default TaskReview;
