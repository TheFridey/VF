import { render, screen, waitFor } from '@testing-library/react';
import AdminShell from './AdminShell';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const push = vi.fn();
const setUser = vi.fn();

vi.mock('@/lib/api', () => ({
  adminApi: {
    getMe: vi.fn(),
  },
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard',
}));

vi.mock('./Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

describe('AdminShell', () => {
  beforeEach(() => {
    push.mockReset();
    setUser.mockReset();
  });

  it('redirects unauthenticated visitors to login when /auth/me fails', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      _hasHydrated: true,
      setUser,
    } as never);
    vi.mocked(adminApi.getMe).mockRejectedValue(new Error('unauthorized'));

    render(
      <AdminShell>
        <div>Protected content</div>
      </AdminShell>,
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('renders protected content for a hydrated moderator session', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'mod-1', email: 'mod@test.com', role: 'MODERATOR' },
      _hasHydrated: true,
      setUser,
    } as never);

    render(
      <AdminShell>
        <div>Protected content</div>
      </AdminShell>,
    );

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
