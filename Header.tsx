import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, Briefcase, User, LogOut, LayoutDashboard, Shield, ChevronDown, FileText, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BRAND } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
  const registerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setRegisterMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (registerMenuRef.current && !registerMenuRef.current.contains(e.target as Node)) {
        setRegisterMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: 'Əsas səhifə', path: '/' },
    { label: 'Vakansiyalar', path: '/vakansiyalar' },
    { label: 'CV-lər', path: '/cv-ler' },
    { label: 'Şirkətlər', path: '/sirketler' },
    { label: 'Premium', path: '/vakansiyalar?type=premium' },
    { label: 'Qiymətlər', path: '/qiymetler' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path.split('?')[0]);
  };

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary-700">{BRAND.name}</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(link.path)
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-700 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                    {user.email[0].toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-slide-down">
                      {user.role === 'employer' && (
                        <>
                          <div className="px-3 py-2 border-b border-gray-100">
                            <p className="text-xs text-gray-500">Şirkət</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.company?.company_name || 'Tamamlamamış'}
                            </p>
                          </div>
                          <Link
                            to="/employer/dashboard"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LayoutDashboard className="w-4 h-4" /> İdarəetmə paneli
                          </Link>
                        </>
                      )}
                      {user.role === 'candidate' && (
                        <>
                          <div className="px-3 py-2 border-b border-gray-100">
                            <p className="text-xs text-gray-500">Namizəd</p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.candidate ? `${user.candidate.first_name} ${user.candidate.last_name}` : user.email}
                            </p>
                          </div>
                          <Link
                            to="/namized/dashboard"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <LayoutDashboard className="w-4 h-4" /> Şəxsi kabinet
                          </Link>
                        </>
                      )}
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Shield className="w-4 h-4" /> Admin paneli
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" /> Çıxış
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/giris"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors"
                >
                  <User className="w-4 h-4" /> Giriş
                </Link>
                <div className="relative" ref={registerMenuRef}>
                  <button
                    onClick={() => setRegisterMenuOpen(!registerMenuOpen)}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    Qeydiyyat
                    <ChevronDown className={cn('w-4 h-4 transition-transform', registerMenuOpen && 'rotate-180')} />
                  </button>
                  {registerMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-slide-down">
                      <Link
                        to="/qeydiyyat/isegoturen"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">İşəgötürən</p>
                          <p className="text-xs text-gray-500">Şirkət qeydiyyatı</p>
                        </div>
                      </Link>
                      <Link
                        to="/qeydiyyat/namized"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0">
                          <UserCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">İş axtaran</p>
                          <p className="text-xs text-gray-500">Namizəd qeydiyyatı</p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-slide-down">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  'block px-3 py-2 rounded-lg text-sm font-medium',
                  isActive(link.path)
                    ? 'text-primary-700 bg-primary-50'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              {user ? (
                <>
                  {user.role === 'employer' && (
                    <Link
                      to="/employer/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <LayoutDashboard className="w-4 h-4" /> İdarəetmə paneli
                    </Link>
                  )}
                  {user.role === 'candidate' && (
                    <Link
                      to="/namized/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Şəxsi kabinet
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <Shield className="w-4 h-4" /> Admin paneli
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg w-full text-left"
                  >
                    <LogOut className="w-4 h-4" /> Çıxış
                  </button>
                </>
              ) : (
                <>
                  <Link to="/giris" className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                    Giriş
                  </Link>
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-500 mb-2">Qeydiyyat</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/qeydiyyat/isegoturen" className="btn-primary text-sm text-center">
                        İşəgötürən
                      </Link>
                      <Link to="/qeydiyyat/namized" className="btn-secondary text-sm text-center">
                        İş axtaran
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
