import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, accessToken, isAuthenticated, setUser, setTokens, logout: storeLogout, setLoading } = useAuthStore();

  // Fetch current user data
  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getMe(),
    enabled: !!accessToken && !user,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update user in store when data is fetched
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData, setUser]);

  // Set loading to false once query completes
  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading, setLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => api.login(data),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: { email: string; password: string; role?: string }) => api.register(data),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  // Logout function
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      // Continue with logout even if API fails
    } finally {
      storeLogout();
      queryClient.clear();
      router.push('/auth/login');
    }
  }, [storeLogout, queryClient, router]);

  // Check if user has specific role
  const hasRole = useCallback(
    (role: string | string[]) => {
      if (!user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    },
    [user]
  );

  // Check if user is a veteran
  const isVeteran = useCallback(() => {
    return hasRole(['VETERAN_UNVERIFIED', 'VETERAN_VERIFIED', 'VETERAN_PAID']);
  }, [hasRole]);

  // Check if user is a verified veteran
  const isVerifiedVeteran = useCallback(() => {
    return hasRole(['VETERAN_VERIFIED', 'VETERAN_PAID']);
  }, [hasRole]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return hasRole(['ADMIN']);
  }, [hasRole]);

  // Check if user is moderator
  const isModerator = useCallback(() => {
    return hasRole(['MODERATOR', 'ADMIN']);
  }, [hasRole]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    isRegistering: registerMutation.isPending,
    logout,
    refetchUser: refetch,
    hasRole,
    isVeteran,
    isVerifiedVeteran,
    isAdmin,
    isModerator,
  };
}
