import { create } from 'zustand';
import { authService, type AuthUser } from '../services/auth.service';
import { configureRefreshHandler, setAccessToken } from '../services/authToken';
import { invalidatePrivateRequests } from '../services/api';
import { clearPrivateState } from './privateState';

type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  markPasswordChanged: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

let initialization: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  const acceptSession = (payload: { access_token: string; user: AuthUser }) => {
    setAccessToken(payload.access_token);
    set({ status: 'authenticated', user: payload.user });
    return payload.user;
  };

  configureRefreshHandler(async () => {
    try {
      const payload = await authService.refresh();
      acceptSession(payload);
      return payload.access_token;
    } catch {
      setAccessToken(null);
      invalidatePrivateRequests();
      clearPrivateState();
      set({ status: 'anonymous', user: null });
      return null;
    }
  });

  return {
    status: 'checking',
    user: null,
    initialize: async () => {
      if (!initialization) initialization = authService.refresh()
        .then((payload) => { acceptSession(payload); })
        .catch(() => {
          setAccessToken(null);
          invalidatePrivateRequests();
          clearPrivateState();
          set({ status: 'anonymous', user: null });
        });
      await initialization;
    },
    login: async (email, password) => acceptSession(await authService.login(email, password)),
    logout: async () => {
      await authService.logout();
      setAccessToken(null);
      invalidatePrivateRequests();
      clearPrivateState();
      set({ status: 'anonymous', user: null });
    },
    markPasswordChanged: async () => {
      const payload = await authService.refresh();
      acceptSession(payload);
    },
    hasPermission: (permission) => Boolean(get().user?.permissions.includes(permission)),
  };
});
