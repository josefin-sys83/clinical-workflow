// hooks/useLogout.ts
import { useNavigate } from 'react-router-dom';
import { logout } from '@/shared/auth/token';
export const useLogout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    void logout();      // calls your existing async logout function
    navigate('/login'); // redirects to login
  };

  return handleLogout;
};