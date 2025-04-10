import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchUserProfile } from './features/auth/authSlice';
import { AppRoutes } from './router';

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch]);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
