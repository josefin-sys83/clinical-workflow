// components/LogoutButton.tsx
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  onLogout: () => void;
  className?: string; // optional for future flexibility
}

export const LogoutButton = ({ onLogout, className = '' }: LogoutButtonProps) => {
  return (
    <button
      onClick={onLogout}
      className={className}
    >
      <LogOut className="h-4 w-4 text-gray-500" />
      <span>Log out</span>
    </button>
  );
};