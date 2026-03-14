import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

/**
 * useAuth — convenience hook for auth state and mutations.
 *
 * Tokens (access_token, refresh_token) are HttpOnly cookies — JavaScript
 * never reads or stores them.  This hook only exposes the user profile from
 * Zustand and re-fetches it from /auth/me when the store is empty (e.g. after
 * a hard refresh where localStorage was cleared).
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, setUser, logout: storeLogout } = useAuthStore();

  // Re-hydrate user profile from the server if the Zustand store is empty
  // but the access_token cookie is still valid (e.g. page refresh).
  // Enabled when the user slot is empty — the cookie presence is unknown
  // to JS but getMe() will 401 if it's gone, which is handled gracefully.
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await api.getMe();
      } catch {
        return null;
      }
    },
    enabled: !user && !isLoading,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Sync fetched user into store
  useEffect(() => {
    if (userData && !user) {
      setUser(userData);
    }
  }, [user, userData, setUser]);

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // continue even if API call fails
    } finally {
      storeLogout();
      queryClient.clear();
      router.push('/auth/login');
    }
  }, [storeLogout, queryClient, router]);

  // Role helpers
  const hasRole = useCallback(
    (role: string | string[]) => {
      if (!user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    },
    [user],
  );

  const isVeteran = useCallback(
    () => hasRole(['VETERAN_UNVERIFIED', 'VETERAN_VERIFIED', 'VETERAN_MEMBER']),
    [hasRole],
  );

  const isVerifiedVeteran = useCallback(
    () => hasRole(['VETERAN_VERIFIED', 'VETERAN_MEMBER']),
    [hasRole],
  );

  const isAdmin = useCallback(() => hasRole(['ADMIN']), [hasRole]);
  const isModerator = useCallback(() => hasRole(['MODERATOR', 'ADMIN']), [hasRole]);

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
    hasRole,
    isVeteran,
    isVerifiedVeteran,
    isAdmin,
    isModerator,
  };
}
