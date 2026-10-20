import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ subscription: { unsubscribe: vi.fn() } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        })),
      })),
    })),
  },
}));

import { AuthProvider, useAuth } from '@/context/AuthContext';

function TestComponent() {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? 'logged-in' : 'logged-out'}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <TestComponent />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading=true and no user', () => {
    renderWithProvider();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('eventually sets loading=false with no session', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    }, { timeout: 3000 });
    expect(screen.getByTestId('user')).toHaveTextContent('logged-out');
  });
});
