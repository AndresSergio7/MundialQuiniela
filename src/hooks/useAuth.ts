import { useAuthStore } from '@/store/auth';
import { signOut } from '@/services/auth.service';

export function useAuth() {
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);

  return {
    session,
    user,
    isAuthenticated: !!session,
    signOut,
  };
}
