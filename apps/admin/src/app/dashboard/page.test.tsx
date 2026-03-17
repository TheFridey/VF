import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { adminApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  adminApi: {
    getDashboard: vi.fn(),
    getHealth: vi.fn(),
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getDashboard).mockResolvedValue({
      totalUsers: 128,
      newUsersToday: 6,
      verifiedVeterans: 84,
      pendingVerifications: 3,
      pendingReports: 2,
      suspendedUsers: 1,
      matchesToday: 9,
      totalConnections: 52,
    });
    vi.mocked(adminApi.getHealth).mockResolvedValue({
      status: 'ok',
      database: { status: 'ok', latency: 18 },
      redis: { status: 'warn', latency: 42 },
    });
  });

  it('renders key metrics and dependency health blocks', async () => {
    render(<DashboardPage />);

    expect(screen.getByText('Command Dashboard')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('128')).toBeInTheDocument();
    });

    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('3 awaiting review')).toBeInTheDocument();
    expect(screen.getByText('Open Reports')).toBeInTheDocument();
    expect(screen.getByText('Platform dependencies')).toBeInTheDocument();
    expect(screen.getByText('18ms query time')).toBeInTheDocument();
    expect(screen.getByText('42ms ping')).toBeInTheDocument();
  });
});
