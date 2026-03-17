import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  adminApi: {
    login: vi.fn(),
  },
}));

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastError,
  },
}));

describe('Admin LoginPage', () => {
  const setUser = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({ setUser } as never);
    setUser.mockReset();
    toastError.mockReset();
    vi.mocked(adminApi.login).mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/auth/login' },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('renders the login form and authenticates admin users', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    expect(screen.getByText('COMMAND CENTRE')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('admin@veteranfinder.co.uk'), 'admin@test.com');
    await user.type(screen.getByPlaceholderText('************'), 'StrongPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(adminApi.login).toHaveBeenCalledWith('admin@test.com', 'StrongPassword123!');
    expect(setUser).toHaveBeenCalledWith({
      id: 'admin-1',
      email: 'admin@test.com',
      role: 'ADMIN',
    });
  });
});
