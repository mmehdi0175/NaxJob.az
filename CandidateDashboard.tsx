import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, FileText, Settings, LogOut, User, Menu, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/namized/dashboard', label: 'Ümumi baxış', icon: LayoutDashboard, end: true },
  { to: '/namized/dashboard/cv-lerim', label: 'CV-lərim', icon: FileText, end: false },
  { to: '/namized/dashboard/yeni-cv', label: 'Yeni CV', icon: PlusCircle, end: false },
  { to: '/namized/dashboard/profil', label: 'Profilim', icon: Settings, end: false },
];

export default function CandidateDashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/giris');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'employer') {
        navigate('/employer/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== 'candidate') return null;

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const displayName = user.candidate
    ? `${user.candidate.first_name} ${user.candidate.last_name}`
    : 'Tamamlanmamış';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-primary-700">İşBaza</span>
            </Link>
            <span className="hidden sm:inline text-sm text-gray-400">/</span>
            <span className="hidden sm:inline text-sm font-medium text-gray-600">İdarəetmə paneli</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                {displayName}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
              {user.email[0].toUpperCase()}
            </div>
            <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Çıxış">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={cn(
          'w-64 bg-white border-r border-gray-200 shrink-0',
          'fixed lg:sticky top-16 bottom-0 z-30 transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <nav className="p-4 space-y-1 h-[calc(100vh-4rem)] overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
