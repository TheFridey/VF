import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationPage from './page';
import { adminApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  adminApi: {
    getPendingVerifications: vi.fn(),
    approveVerification: vi.fn(),
    rejectVerification: vi.fn(),
    bulkReviewVerifications: vi.fn(),
  },
}));

vi.mock('@/lib/use-persisted-admin-state', () => ({
  usePersistedAdminState: vi.fn(() => [
    { status: 'PENDING' },
    vi.fn(),
    true,
  ]),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('VerificationPage', () => {
  beforeEach(() => {
    vi.mocked(adminApi.getPendingVerifications).mockResolvedValue({
      requests: [
        {
          id: 'req-1',
          status: 'PENDING',
          createdAt: '2026-03-17T08:00:00.000Z',
          evidenceUrls: ['https://example.test/evidence-1'],
          notes: '',
          rejectionReason: null,
          sla: { urgency: 'urgent', hoursElapsed: 37, targetHours: 48 },
          user: {
            email: 'pending@test.com',
            profile: { displayName: 'Pending Veteran' },
            veteranDetails: { branch: 'BRITISH_ARMY', regiment: '1 PARA' },
          },
        },
      ],
      slaSummary: { normal: 0, urgent: 1, breached: 0 },
    });
    vi.mocked(adminApi.approveVerification).mockResolvedValue({ success: true });
    vi.mocked(adminApi.bulkReviewVerifications).mockResolvedValue({ updatedCount: 0, skippedCount: 0 });
  });

  it('renders the verification queue and approves a request', async () => {
    const user = userEvent.setup();
    render(<VerificationPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Veteran')).toBeInTheDocument();
    });

    expect(screen.getByText('BRITISH_ARMY')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /review/i }));
    await user.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => {
      expect(adminApi.approveVerification).toHaveBeenCalledWith('req-1', '');
    });
  });
});
