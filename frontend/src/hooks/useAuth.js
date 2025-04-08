import { useSelector, useDispatch } from 'react-redux';
import { logout, fetchProfile } from '../features/auth/authSlice';

const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const doLogout = () => dispatch(logout());
  const refreshProfile = () => dispatch(fetchProfile());

  return {
    user,
    isAuthenticated,
    loading,
    error,
    doLogout,
    refreshProfile,
  };
};

export default useAuth;
