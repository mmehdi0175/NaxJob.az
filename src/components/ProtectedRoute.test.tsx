import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { AuthUser } from '@/types';

const mockAuth = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));

import ProtectedRoute from '@/components/ProtectedRoute';

function renderAt(path: string, role?: 'employer' | 'candidate' | 'admin') {
  mockAuth.mockReturnValue({
    user: { id: 'u1', email: 'test@test.az', role: 'employer', company: null, candidate: null } as AuthUser,
    loading: false,
    signOut: vi.fn(),
    refreshCompany: vi.fn(),
    refreshCandidate: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/employer/dashboard" element={<ProtectedRoute role={role}><div>Protected Content</div></ProtectedRoute>} />
        <Route path="/giris" element={<div>Login Page</div>} />
        <Route path="/namized/dashboard" element={<div>Candidate Dashboard</div>} />
        <Route path="/admin" element={<div>Admin Panel</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loading spinner when auth is loading', () => {
    mockAuth.mockReturnValue({ user: null, loading: true, signOut: vi.fn(), refreshCompany: vi.fn(), refreshCandidate: vi.fn() });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is null', () => {
    mockAuth.mockReturnValue({ user: null, loading: false, signOut: vi.fn(), refreshCompany: vi.fn(), refreshCandidate: vi.fn() });
    render(
      <MemoryRouter initialEntries={['/employer/dashboard']}>
        <Routes>
          <Route path="/employer/dashboard" element={<ProtectedRoute><div>Protected Content</div></ProtectedRoute>} />
          <Route path="/giris" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user has correct role', () => {
    renderAt('/employer/dashboard', 'employer');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to correct dashboard when role mismatch', () => {
    mockAuth.mockReturnValue({
      user: { id: 'u1', email: 'admin@test.az', role: 'admin', company: null, candidate: null } as AuthUser,
      loading: false,
      signOut: vi.fn(),
      refreshCompany: vi.fn(),
      refreshCandidate: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/employer/dashboard']}>
        <Routes>
          <Route path="/employer/dashboard" element={<ProtectedRoute role="employer"><div>Protected Content</div></ProtectedRoute>} />
          <Route path="/admin" element={<div>Admin Panel</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
