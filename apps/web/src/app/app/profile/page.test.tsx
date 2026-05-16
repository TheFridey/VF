import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from './page';
import { useAuthStore } from '@/stores/auth-store';

const { getProfile, getVeteranDetails, updateProfile, updateVeteranDetails, toastSuccess, toastError } = vi.hoisted(() => ({
  getProfile: vi.fn(),
  getVeteranDetails: vi.fn(),
  updateProfile: vi.fn(),
  updateVeteranDetails: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    getProfile,
    getVeteranDetails,
    updateProfile,
    updateVeteranDetails,
  },
}));

vi.mock('@/components/photo-upload', () => ({
  PhotoUpload: () => <div data-testid="photo-upload">Photo Upload</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe('ProfilePage', () => {
  const emptyProfile = {
    id: 'profile-1',
    userId: 'user-1',
    displayName: '',
    bio: '',
    gender: null,
    dateOfBirth: null,
    location: '',
    interests: [],
    updatedAt: '2026-05-16T09:00:00.000Z',
  };

  const savedProfile = {
    ...emptyProfile,
    displayName: 'Alex Morgan',
    bio: 'Signals veteran and volunteer mentor.',
    gender: 'NON_BINARY',
    dateOfBirth: '1988-06-15T00:00:00.000Z',
    location: 'Leeds',
    interests: ['Hiking', 'Mentoring'],
    updatedAt: '2026-05-16T09:30:00.000Z',
  };

  const veteranDetails = {
    id: 'veteran-1',
    userId: 'user-1',
    branch: 'BRITISH_ARMY',
    rank: 'Sergeant',
    regiment: 'royal-signals',
    mos: 'Signals',
    deployments: [],
    dutyStations: [],
    servicePeriods: [],
  };

  function renderPage(queryClient: QueryClient) {
    return render(
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    getProfile.mockReset();
    getVeteranDetails.mockReset();
    updateProfile.mockReset();
    updateVeteranDetails.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    window.localStorage.clear();

    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'alex@example.com',
        role: 'VETERAN_VERIFIED',
        status: 'ACTIVE',
        emailVerified: true,
        profile: {
          displayName: '',
        },
        veteranDetails: {
          branch: 'BRITISH_ARMY',
          rank: 'Sergeant',
          mos: 'Signals',
        },
      },
      isAuthenticated: true,
      isLoading: false,
      _hasHydrated: true,
    });
  });

  it('keeps saved profile values populated after mutation success and remount', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    getProfile
      .mockResolvedValueOnce(emptyProfile)
      .mockResolvedValue(savedProfile);
    getVeteranDetails.mockResolvedValue(veteranDetails);
    updateProfile.mockResolvedValue(savedProfile);

    const firstRender = renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name')).toHaveValue('');
    });

    await user.type(screen.getByLabelText('Display Name'), 'Alex Morgan');
    await user.type(screen.getByLabelText('Location'), 'Leeds');
    await user.type(screen.getByLabelText('Bio'), 'Signals veteran and volunteer mentor.');
    await user.selectOptions(screen.getByLabelText('Gender'), 'NON_BINARY');
    await user.type(screen.getByLabelText('Date of Birth'), '1988-06-15');

    await user.type(screen.getByPlaceholderText('Add an interest'), 'Hiking{enter}');
    await user.type(screen.getByPlaceholderText('Add an interest'), 'Mentoring{enter}');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: 'Alex Morgan',
        bio: 'Signals veteran and volunteer mentor.',
        gender: 'NON_BINARY',
        dateOfBirth: '1988-06-15',
        location: 'Leeds',
        interests: ['Hiking', 'Mentoring'],
      });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(['profile'])).toEqual(savedProfile);
    });

    expect(screen.getByLabelText('Display Name')).toHaveValue('Alex Morgan');
    expect(screen.getByLabelText('Location')).toHaveValue('Leeds');
    expect(screen.getByLabelText('Bio')).toHaveValue('Signals veteran and volunteer mentor.');
    expect(screen.getByLabelText('Gender')).toHaveValue('NON_BINARY');
    expect(screen.getByLabelText('Date of Birth')).toHaveValue('1988-06-15');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    firstRender.unmount();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByLabelText('Display Name')).toHaveValue('Alex Morgan');
    });

    expect(screen.getByLabelText('Location')).toHaveValue('Leeds');
    expect(screen.getByLabelText('Bio')).toHaveValue('Signals veteran and volunteer mentor.');
    expect(screen.getByLabelText('Gender')).toHaveValue('NON_BINARY');
    expect(screen.getByLabelText('Date of Birth')).toHaveValue('1988-06-15');
  });
});
