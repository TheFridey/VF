import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BrothersPage from './page';
import { useAuthStore } from '@/stores/auth-store';

const { searchBrothers, getConnectionRequests, sendConnectionRequest, respondToConnection } = vi.hoisted(() => ({
  searchBrothers: vi.fn(),
  getConnectionRequests: vi.fn(),
  sendConnectionRequest: vi.fn(),
  respondToConnection: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    searchBrothers,
    getConnectionRequests,
    sendConnectionRequest,
    respondToConnection,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: React.HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
  },
}));

vi.mock('@/components/ui/modal', () => ({
  Modal: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div>{children}</div> : null),
}));

describe('BrothersPage', () => {
  function renderPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BrothersPage />
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    searchBrothers.mockReset();
    getConnectionRequests.mockReset();
    sendConnectionRequest.mockReset();
    respondToConnection.mockReset();

    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'alex@example.com',
        role: 'VETERAN_VERIFIED',
        status: 'ACTIVE',
        emailVerified: true,
        profile: {
          displayName: 'Alex Morgan',
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

    getConnectionRequests.mockResolvedValue({ requests: [] });
  });

  it('renders veteran-specific shared service reasons and service-period details', async () => {
    searchBrothers.mockResolvedValue([
      {
        id: 'candidate-1',
        displayName: 'Chris Turner',
        overlapScore: 0.82,
        location: 'Leeds',
        overlapReasons: [
          'Same regiment: 1 Para',
          'Same unit: A Company 1 Para',
          'Shared service period: 2011-2013',
          'Shared deployment: Afghanistan',
        ],
        veteranInfo: {
          branch: 'BRITISH_ARMY',
          rank: 'Colour Sergeant',
          regiment: '1-para',
          isVerified: true,
        },
        overlappingPeriods: [
          {
            branch: 'BRITISH_ARMY',
            dateRange: '2011-2013',
            location: 'Colchester',
          },
        ],
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Chris Turner')).toBeInTheDocument();
    });

    expect(screen.getByText('82% Shared service evidence')).toBeInTheDocument();
    expect(screen.getAllByText('High confidence').length).toBeGreaterThan(0);
    expect(screen.getByText('Regiment on file: 1 Para')).toBeInTheDocument();
    expect(screen.getAllByText('Shared regiment: 1 Para').length).toBeGreaterThan(0);
    expect(screen.getByText('Shared battalion or unit: A Company 1 Para')).toBeInTheDocument();
    expect(screen.getByText('Service periods on record')).toBeInTheDocument();
    expect(screen.getByText('British Army | 2011-2013 | Colchester')).toBeInTheDocument();
  });

  it('renders low-confidence guidance without overconfident wording', async () => {
    searchBrothers.mockResolvedValue([
      {
        id: 'candidate-2',
        displayName: 'Taylor Reed',
        overlapScore: 0.22,
        overlapReasons: [],
        veteranInfo: {
          branch: 'BRITISH_ARMY',
          rank: 'Corporal',
          regiment: null,
          isVerified: true,
        },
        overlappingPeriods: [],
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Taylor Reed')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Broad suggestion').length).toBeGreaterThan(0);
    expect(screen.queryByText(/22%/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Treat this as a prompt to compare unit, tour, or deployment detail/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This profile is visible to you as part of the broader veteran network/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Some results are broad suggestions/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /send request/i }));

    expect(screen.getByText('Limited evidence')).toBeInTheDocument();
    expect(screen.queryByText(/22%/)).not.toBeInTheDocument();
  });

  it('renders medium-confidence matches without a raw percentage', async () => {
    searchBrothers.mockResolvedValue([
      {
        id: 'candidate-3',
        displayName: 'Morgan Ellis',
        overlapScore: 0.56,
        overlapReasons: [
          'Shared service period: 2012-2014',
          'Shared station: Colchester',
        ],
        veteranInfo: {
          branch: 'BRITISH_ARMY',
          rank: 'Sergeant',
          regiment: 'royal-signals',
          isVerified: true,
        },
        overlappingPeriods: [
          {
            branch: 'BRITISH_ARMY',
            dateRange: '2012-2014',
            location: 'Colchester',
          },
        ],
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Morgan Ellis')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Useful lead').length).toBeGreaterThan(0);
    expect(screen.queryByText(/56%/)).not.toBeInTheDocument();
    expect(screen.getByText(/Some service details overlap, but confirm the specifics/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /send request/i }));

    expect(screen.getByText('Possible shared-service connection')).toBeInTheDocument();
    expect(screen.queryByText(/56%/)).not.toBeInTheDocument();
  });
});
