import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import Login from '@/pages/auth/Login';

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login form with heading and inputs', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /giriş/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@company\.az/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /daxil ol/i })).toBeInTheDocument();
  });

  it('shows error when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /daxil ol/i }));

    await waitFor(() => {
      expect(screen.getByText(/email və şifrə daxil edin/i)).toBeInTheDocument();
    });
  });

  it('updates input values on user input', async () => {
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByPlaceholderText(/name@company\.az/i);
    await user.type(emailInput, 'test@example.com');
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('has a link to registration page', () => {
    renderLogin();
    const registerLink = screen.getByRole('link', { name: /qeydiyyatdan keçin/i });
    expect(registerLink).toBeInTheDocument();
  });
});
