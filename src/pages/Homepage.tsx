import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, Search, MapPin, Star, Building2, Clock, Eye, ArrowRight,
  TrendingUp, FileText, ChevronDown, Menu, X, User, LogOut,
  LayoutDashboard, Shield, Plus, Calendar, Wallet, GraduationCap,
  Mail, Phone, Send, Copy, Check, Users, UserCircle, Download,
  Zap, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLookupData } from '@/hooks/useLookupData';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';
import { NAXCIVAN_REGION_SLUGS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatSalary, formatDate, timeAgo, daysUntilExpiry } from '@/lib/format';
import type { Vacancy, Company, Category, Candidate, AdminSettings } from '@/types';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useModalAccessibility } from '@/hooks/useModalAccessibility';

type ContentView = 'vacancies' | 'categories' | 'industries' | 'companies' | 'cv' | 'premium' | 'pricing';

export default function Homepage() {
  const { user, signOut } = useAuth();
  const { categories, regions, loading } = useLookupData();
  const navigate = useNavigate();

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [premiumVacancies, setPremiumVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pricingSettings, setPricingSettings] = useState<AdminSettings | null>(null);
  const [vacancyLoading, setVacancyLoading] = useState(true);
  const [cvLoading, setCvLoading] = useState(false);
  const [stats, setStats] = useState({ daily: 0, weekly: 0, monthly: 0, companies: 0 });
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
  const [elanlarOpen, setElanlarOpen] = useState(true);
  const [contentView, setContentView] = useState<ContentView>('vacancies');
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [categoryVacancies, setCategoryVacancies] = useState<Vacancy[]>([]);
  const [companyVacancies, setCompanyVacancies] = useState<Vacancy[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cvSearch, setCvSearch] = useState('');
  const [cvCityFilter, setCvCityFilter] = useState('');

  // Load vacancies (premium-ordered via RPC) + companies + stats
  useEffect(() => {
    async function loadData() {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [vacRes, premRes, compRes, dailyRes, weeklyRes, monthlyRes, compCountRes] = await Promise.all([
        supabase.rpc('get_ordered_vacancies', { p_limit: 10, p_offset: 0 }),
        supabase
          .from('vacancies')
          .select('*, company:companies(*), category:categories(*), city:cities(*)')
          .eq('status', 'active')
          .eq('vacancy_type', 'premium')
          .order('published_at', { ascending: false })
          .limit(10),
        supabase
          .from('companies')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startOfToday),
        supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startOfWeek),
        supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', startOfMonth),
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      // RPC returns plain rows; we need joins for display, so fetch with joins matching the IDs
      const orderedIds = (vacRes.data as Vacancy[] | null)?.map(v => v.id) || [];
      let orderedVacancies: Vacancy[] = [];
      if (orderedIds.length > 0) {
        const { data: joined } = await supabase
          .from('vacancies')
          .select('*, company:companies(*), category:categories(*), city:cities(*)')
          .in('id', orderedIds);
        // Preserve RPC ordering
        const joinedMap = new Map((joined as unknown as Vacancy[] || []).map(v => [v.id, v]));
        orderedVacancies = orderedIds.map(id => joinedMap.get(id)).filter(Boolean) as Vacancy[];
      }

      setVacancies(orderedVacancies);
      setPremiumVacancies((premRes.data as unknown as Vacancy[]) || []);
      setCompanies((compRes.data as unknown as Company[]) || []);
      setStats({
        daily: dailyRes.count || 0,
        weekly: weeklyRes.count || 0,
        monthly: monthlyRes.count || 0,
        companies: compCountRes.count || 0,
      });
      setVacancyLoading(false);
    }
    loadData();
  }, []);

  // Load CVs when CV view is selected
  useEffect(() => {
    if (contentView !== 'cv') return;
    async function loadCVs() {
      setCvLoading(true);
      let query = supabase
        .from('candidates')
        .select('*, city:cities(*)')
        .eq('cv_visible', true)
        .not('profession', 'is', null)
        .order('updated_at', { ascending: false });
      if (cvSearch.trim()) {
        query = query.or(`profession.ilike.%${cvSearch.trim()}%,skills.ilike.%${cvSearch.trim()}%,first_name.ilike.%${cvSearch.trim()}%,last_name.ilike.%${cvSearch.trim()}%`);
      }
      if (cvCityFilter) query = query.eq('city_id', cvCityFilter);
      const { data } = await query.limit(20);
      setCandidates((data as unknown as Candidate[]) || []);
      setCvLoading(false);
    }
    loadCVs();
  }, [contentView, cvSearch, cvCityFilter]);

  // Load pricing settings when pricing view is selected
  useEffect(() => {
    if (contentView !== 'pricing' || pricingSettings) return;
    supabase.from('admin_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setPricingSettings(data as AdminSettings);
    });
  }, [contentView, pricingSettings]);

  // Filter vacancies locally based on keyword/city/category/company
  const filteredVacancies = useCallback(() => {
    let result = vacancies;
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(kw) ||
        v.company?.company_name?.toLowerCase().includes(kw) ||
        v.category?.name_az?.toLowerCase().includes(kw)
      );
    }
    if (city) result = result.filter(v => v.city_id === city);
    if (categoryFilter) result = result.filter(v => v.category_id === categoryFilter);
    if (companyFilter) result = result.filter(v => v.company_id === companyFilter);
    return result;
  }, [vacancies, keyword, city, categoryFilter, companyFilter]);

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.createElement('input');
      input.value = email;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
      document.body.removeChild(input);
    });
  }

  async function loadCategoryVacancies(catId: string) {
    setSelectedCategory(catId);
    const { data: rpcData } = await supabase.rpc('get_ordered_vacancies_by_category', { p_category_id: catId, p_limit: 20 });
    const ids = (rpcData as Vacancy[] | null)?.map(v => v.id) || [];
    if (ids.length > 0) {
      const { data: joined } = await supabase
        .from('vacancies')
        .select('*, company:companies(*), category:categories(*), city:cities(*)')
        .in('id', ids);
      const joinedMap = new Map((joined as unknown as Vacancy[] || []).map(v => [v.id, v]));
      setCategoryVacancies(ids.map(id => joinedMap.get(id)).filter(Boolean) as Vacancy[]);
    } else {
      setCategoryVacancies([]);
    }
  }

  async function loadCompanyVacancies(compId: string) {
    setSelectedCompany(compId);
    const { data: rpcData } = await supabase.rpc('get_ordered_vacancies_by_company', { p_company_id: compId, p_limit: 20 });
    const ids = (rpcData as Vacancy[] | null)?.map(v => v.id) || [];
    if (ids.length > 0) {
      const { data: joined } = await supabase
        .from('vacancies')
        .select('*, company:companies(*), category:categories(*), city:cities(*)')
        .in('id', ids);
      const joinedMap = new Map((joined as unknown as Vacancy[] || []).map(v => [v.id, v]));
      setCompanyVacancies(ids.map(id => joinedMap.get(id)).filter(Boolean) as Vacancy[]);
    } else {
      setCompanyVacancies([]);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setContentView('vacancies');
  }

  function clearFilters() {
    setKeyword('');
    setCity('');
    setCategoryFilter('');
    setCompanyFilter('');
  }

  function switchView(view: ContentView) {
    setContentView(view);
    setSelectedVacancy(null);
  }

  const hasFilters = keyword || city || categoryFilter || companyFilter;
  const isEmployer = user?.role === 'employer';
  const cvRegions = regions.filter(r => NAXCIVAN_REGION_SLUGS.includes(r.slug as typeof NAXCIVAN_REGION_SLUGS[number]));

  const elanlarSubItems: { label: string; view: ContentView }[] = [
    { label: 'Bütün elanlar', view: 'vacancies' },
    { label: 'Kateqoriyalar', view: 'categories' },
    { label: 'Sənaye', view: 'industries' },
    { label: 'Şirkətlər', view: 'companies' },
  ];

  const navItems: { label: string; view: ContentView; icon: typeof Briefcase }[] = [
    { label: 'CV-lər', view: 'cv', icon: FileText },
    { label: 'Şirkətlər', view: 'companies', icon: Building2 },
    { label: 'Premium', view: 'premium', icon: Star },
    { label: 'Qiymətlər', view: 'pricing', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP BAR — Logo + Auth buttons */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100" aria-label={mobileNavOpen ? 'Menyunu bağla' : 'Menyunu aç'}>
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-primary-700">{BRAND.name}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === 'employer' && (
                  <Link to="/employer/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-primary-700 transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Panel
                  </Link>
                )}
                {user.role === 'candidate' && (
                  <Link to="/namized/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-primary-700 transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Kabinet
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:text-primary-700 transition-colors">
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                )}
                <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label="Çıxış">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Çıxış</span>
                </button>
              </div>
            ) : (
              <>
                <Link to="/giris" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-700 transition-colors">
                  <User className="w-4 h-4" /> Giriş
                </Link>
                <div className="relative">
                  <button onClick={() => setRegisterMenuOpen(!registerMenuOpen)} className="btn-primary text-sm flex items-center gap-1.5">
                    Qeydiyyat
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', registerMenuOpen && 'rotate-180')} />
                  </button>
                  {registerMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setRegisterMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-slide-down">
                        <Link to="/qeydiyyat/isegoturen" onClick={() => setRegisterMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">İşəgötürən</p>
                            <p className="text-xs text-gray-500">Şirkət qeydiyyatı</p>
                          </div>
                        </Link>
                        <Link to="/qeydiyyat/namized" onClick={() => setRegisterMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <div className="w-8 h-8 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">İş axtaran</p>
                            <p className="text-xs text-gray-500">Namizəd qeydiyyatı</p>
                          </div>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14 bg-black/30" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-72 bg-white overflow-y-auto" onClick={e => e.stopPropagation()}>
            <MobileNavContent
              user={user}
              elanlarOpen={elanlarOpen}
              setElanlarOpen={setElanlarOpen}
              contentView={contentView}
              switchView={(v) => { switchView(v); setMobileNavOpen(false); }}
              onPostVacancy={() => { navigate(user?.role === 'employer' ? '/employer/dashboard/yeni-vakansiya' : '/qeydiyyat/isegoturen'); setMobileNavOpen(false); }}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      )}

      <div className="lg:flex lg:gap-4 lg:px-4 lg:py-4 lg:max-w-[1700px] lg:mx-auto">
        {/* LEFT COLUMN — Navigation (wider: 260px) */}
        <aside className="hidden lg:flex flex-col w-[260px] shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col sticky top-[72px] h-[calc(100vh-88px)] overflow-hidden">
            <div className="p-3">
              <button
                onClick={() => navigate(user?.role === 'employer' ? '/employer/dashboard/yeni-vakansiya' : '/qeydiyyat/isegoturen')}
                className="w-full btn-primary text-sm flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Elan yerləşdir
              </button>
            </div>

            {/* Elanlar collapsible menu */}
            <div className="px-2">
              <button
                onClick={() => setElanlarOpen(!elanlarOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4" /> Elanlar
                </span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', elanlarOpen && 'rotate-180')} />
              </button>
              {elanlarOpen && (
                <div className="ml-2 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                  {elanlarSubItems.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => switchView(item.view)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                        contentView === item.view
                          ? 'text-primary-700 bg-primary-50 font-medium'
                          : 'text-gray-600 hover:text-primary-700 hover:bg-gray-50'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Other nav links — inline buttons */}
            <nav className="flex-1 px-2 mt-1 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => switchView(item.view)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    contentView === item.view
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-gray-600 hover:text-primary-700 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="w-4 h-4" /> {item.label}
                </button>
              ))}
            </nav>

            {/* Contact + HR Balance at bottom */}
            <div className="p-3 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 mb-2">Əlaqə</h3>
              <div className="space-y-1 text-xs text-gray-500 mb-3">
                <p>{BRAND.email}</p>
                <p>{BRAND.phone}</p>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">Saytın hazırlanması:</p>
                <p className="text-xs font-medium text-gray-600">HR Balance</p>
                <a href="https://hrbalance.az" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-700 hover:underline">
                  hrbalance.az
                </a>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER COLUMN — Search + Content */}
        <main className="flex-1 min-w-0 px-4 py-4 lg:px-0 lg:py-0">
          {/* Search + Filters — only show for vacancy-related views */}
          {(contentView === 'vacancies' || contentView === 'categories' || contentView === 'industries' || contentView === 'companies' || contentView === 'premium') && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Vakansiya adı, açar söz, şirkət..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                    showFilters ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <MapPin className="w-4 h-4" /> Filtrlər
                  {hasFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                </button>
                <button type="submit" className="btn-primary text-sm whitespace-nowrap">
                  <Search className="w-4 h-4 inline mr-1" /> Axtar
                </button>
              </form>

              {showFilters && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 animate-slide-down">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white">
                    <option value="">Bütün kateqoriyalar</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name_az}</option>)}
                  </select>
                  <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white">
                    <option value="">Bütün şirkətlər</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <select value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white">
                      <option value="">Bütün şəhərlər</option>
                      {regions.map((r) => <option key={r.id} value={r.id}>{r.name_az}</option>)}
                    </select>
                    {hasFilters && (
                      <button onClick={clearFilters} className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">
                        Təmizlə
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CV search */}
          {contentView === 'cv' && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={cvSearch}
                  onChange={(e) => setCvSearch(e.target.value)}
                  placeholder="Peşə, vəzifə, bacarıq axtar..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm"
                />
              </div>
              <select value={cvCityFilter} onChange={(e) => setCvCityFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
                <option value="">Bütün şəhərlər</option>
                {cvRegions.map((r) => <option key={r.id} value={r.id}>{r.name_az}</option>)}
              </select>
            </div>
          )}

          {/* Content based on view */}
          {contentView === 'vacancies' && (
            <VacanciesView
              vacancies={filteredVacancies()}
              loading={vacancyLoading}
              selectedVacancy={selectedVacancy}
              onSelectVacancy={setSelectedVacancy}
              hasFilters={!!hasFilters}
            />
          )}

          {contentView === 'categories' && (
            <CategoriesView
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(id) => { loadCategoryVacancies(id); }}
              categoryVacancies={categoryVacancies}
              onSelectVacancy={setSelectedVacancy}
            />
          )}

          {contentView === 'industries' && (
            <IndustriesView
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(id) => { loadCategoryVacancies(id); }}
              categoryVacancies={categoryVacancies}
              onSelectVacancy={setSelectedVacancy}
            />
          )}

          {contentView === 'companies' && (
            <CompaniesView
              companies={companies}
              selectedCompany={selectedCompany}
              onSelectCompany={(id) => { loadCompanyVacancies(id); }}
              companyVacancies={companyVacancies}
              onSelectVacancy={setSelectedVacancy}
            />
          )}

          {contentView === 'cv' && (
            <CVView candidates={candidates} loading={cvLoading} isEmployer={isEmployer} hasSearch={!!(cvSearch || cvCityFilter)} />
          )}

          {contentView === 'premium' && (
            <VacanciesView
              vacancies={premiumVacancies}
              loading={vacancyLoading}
              selectedVacancy={selectedVacancy}
              onSelectVacancy={setSelectedVacancy}
              hasFilters={false}
              title="Premium vakansiyalar"
              premiumOnly
            />
          )}

          {contentView === 'pricing' && (
            <PricingInline settings={pricingSettings} />
          )}
        </main>

        {/* RIGHT COLUMN — Vacancy Detail + Stats (wider: 360px) */}
        <aside className="hidden lg:flex flex-col w-[360px] shrink-0">
          <div className="sticky top-[72px] h-[calc(100vh-88px)] overflow-y-auto space-y-4">
            {selectedVacancy ? (
              <VacancyDetailInline
                vacancy={selectedVacancy}
                onApply={() => setShowApplyModal(true)}
                onClose={() => setSelectedVacancy(null)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Vakansiya seçin</h3>
                <p className="text-sm text-gray-500">
                  Soldakı siyahıdan vakansiya seçin və ətraflı məlumatı burada görün.
                </p>
              </div>
            )}

            {/* Stats at bottom */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Statistika</h3>
              <div className="space-y-2">
                <StatRow icon={Calendar} label="Günlük elanlar" value={stats.daily} color="primary" />
                <StatRow icon={Calendar} label="Həftəlik elanlar" value={stats.weekly} color="success" />
                <StatRow icon={Calendar} label="Aylıq elanlar" value={stats.monthly} color="accent" />
                <StatRow icon={Building2} label="Bütün şirkətlər" value={stats.companies} color="primary" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile right column content */}
      <div className="lg:hidden px-4 pb-4 space-y-3">
        {selectedVacancy && (
          <VacancyDetailInline
            vacancy={selectedVacancy}
            onApply={() => setShowApplyModal(true)}
            onClose={() => setSelectedVacancy(null)}
          />
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Statistika</h3>
          <div className="grid grid-cols-2 gap-2">
            <StatRow icon={Calendar} label="Günlük" value={stats.daily} color="primary" />
            <StatRow icon={Calendar} label="Həftəlik" value={stats.weekly} color="success" />
            <StatRow icon={Calendar} label="Aylıq" value={stats.monthly} color="accent" />
            <StatRow icon={Building2} label="Şirkətlər" value={stats.companies} color="primary" />
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedVacancy && (
        <ApplyModal
          vacancy={selectedVacancy}
          copied={copied}
          onCopy={copyEmail}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
}

// ============ Sub Components ============

function MobileNavContent({ user, elanlarOpen, setElanlarOpen, contentView, switchView, onPostVacancy, onSignOut }: {
  user: ReturnType<typeof useAuth>['user'];
  elanlarOpen: boolean;
  setElanlarOpen: (v: boolean) => void;
  contentView: ContentView;
  switchView: (v: ContentView) => void;
  onPostVacancy: () => void;
  onSignOut: () => void;
}) {
  const subItems: { label: string; view: ContentView }[] = [
    { label: 'Bütün elanlar', view: 'vacancies' },
    { label: 'Kateqoriyalar', view: 'categories' },
    { label: 'Sənaye', view: 'industries' },
    { label: 'Şirkətlər', view: 'companies' },
  ];
  const navItems: { label: string; view: ContentView; icon: typeof Briefcase }[] = [
    { label: 'CV-lər', view: 'cv', icon: FileText },
    { label: 'Şirkətlər', view: 'companies', icon: Building2 },
    { label: 'Premium', view: 'premium', icon: Star },
    { label: 'Qiymətlər', view: 'pricing', icon: TrendingUp },
  ];

  return (
    <div className="p-3 space-y-1">
      <div className="flex justify-center mb-2">
        <LanguageSwitcher />
      </div>
      <button onClick={onPostVacancy} className="w-full btn-primary text-sm flex items-center justify-center gap-1.5 mb-2">
        <Plus className="w-4 h-4" /> Elan yerləşdir
      </button>
      <button onClick={() => setElanlarOpen(!elanlarOpen)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
        <span className="flex items-center gap-2.5"><Briefcase className="w-4 h-4" /> Elanlar</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', elanlarOpen && 'rotate-180')} />
      </button>
      {elanlarOpen && (
        <div className="ml-3 space-y-0.5 border-l border-gray-200 pl-2">
          {subItems.map((item) => (
            <button
              key={item.view}
              onClick={() => switchView(item.view)}
              className={cn(
                'w-full text-left px-3 py-1.5 rounded-lg text-sm',
                contentView === item.view ? 'text-primary-700 bg-primary-50 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {navItems.map((item) => (
        <button
          key={item.view}
          onClick={() => switchView(item.view)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium',
            contentView === item.view ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <item.icon className="w-4 h-4" /> {item.label}
        </button>
      ))}

      <div className="pt-3 mt-3 border-t border-gray-100">
        <h3 className="text-xs font-bold text-gray-900 mb-2">Əlaqə</h3>
        <div className="space-y-1 text-xs text-gray-500 mb-3">
          <p>{BRAND.email}</p>
          <p>{BRAND.phone}</p>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">Saytın hazırlanması:</p>
          <p className="text-xs font-medium text-gray-600">HR Balance</p>
          <a href="https://hrbalance.az" target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">
            hrbalance.az
          </a>
        </div>
      </div>

      {user && (
        <div className="pt-3 mt-3 border-t border-gray-100">
          <button onClick={onSignOut} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full text-left">
            <LogOut className="w-4 h-4" /> Çıxış
          </button>
        </div>
      )}
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }: { icon: typeof Calendar; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    accent: 'bg-accent-100 text-accent-700',
  };
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50/50">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function VacanciesView({ vacancies, loading, selectedVacancy, onSelectVacancy, hasFilters, title, premiumOnly }: {
  vacancies: Vacancy[];
  loading: boolean;
  selectedVacancy: Vacancy | null;
  onSelectVacancy: (v: Vacancy) => void;
  hasFilters: boolean;
  title?: string;
  premiumOnly?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">{title || 'Son iş elanları'}</h2>
        {!premiumOnly && (
          <Link to="/vakansiyalar" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            Bütün vakansiyalar <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto" />
        </div>
      ) : vacancies.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {vacancies.map((v) => (
            <VacancyRow
              key={v.id}
              vacancy={v}
              selected={selectedVacancy?.id === v.id}
              onClick={() => onSelectVacancy(v)}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          {hasFilters ? 'Filtrlərə uyğun vakansiya tapılmadı.' : 'Hal-hazırda aktiv vakansiya yoxdur.'}
        </div>
      )}
    </div>
  );
}

function VacancyRow({ vacancy, selected = false, onClick }: { vacancy: Vacancy; selected?: boolean; onClick: () => void }) {
  const isPremium = vacancy.vacancy_type === 'premium';
  const initials = vacancy.company?.company_name?.[0]?.toUpperCase() || '?';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 text-left transition-colors group',
        selected ? 'bg-primary-50 border-l-4 border-primary-600' : 'hover:bg-gray-50'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
        isPremium ? 'bg-accent-100 text-accent-700' : 'bg-primary-100 text-primary-700'
      )}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {isPremium && <Star className="w-3.5 h-3.5 text-accent-500 fill-accent-500 shrink-0" />}
          <h3 className={cn('text-sm font-semibold line-clamp-1 transition-colors', selected ? 'text-primary-700' : 'text-gray-900 group-hover:text-primary-700')}>
            {vacancy.title}
          </h3>
        </div>
        <p className="text-xs text-gray-600 mb-1 truncate">{vacancy.company?.company_name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {vacancy.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {vacancy.city.name_az}{vacancy.subregion ? `, ${vacancy.subregion}` : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(vacancy.published_at || vacancy.created_at)}
          </span>
          {vacancy.views_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {vacancy.views_count}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
          {formatSalary(vacancy.salary_min, vacancy.salary_max, vacancy.salary_visible, vacancy.salary_currency)}
        </p>
      </div>
    </button>
  );
}

function CategoriesView({ categories, selectedCategory, onSelectCategory, categoryVacancies, onSelectVacancy }: {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  categoryVacancies: Vacancy[];
  onSelectVacancy: (v: Vacancy) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-bold text-gray-900 mb-3">Kateqoriyalar</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg transition-colors group text-left',
                selectedCategory === cat.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                selectedCategory === cat.id ? 'bg-primary-100 text-primary-700' : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100'
              )}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className={cn('text-sm font-medium line-clamp-1', selectedCategory === cat.id ? 'text-primary-700' : 'text-gray-700 group-hover:text-primary-700')}>
                {cat.name_az}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Seçilmiş kateqoriya üzrə elanlar</h3>
          </div>
          {categoryVacancies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {categoryVacancies.map((v) => (
                <VacancyRow key={v.id} vacancy={v} onClick={() => onSelectVacancy(v)} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">Bu kateqoriyada aktiv vakansiya yoxdur.</div>
          )}
        </div>
      )}
    </div>
  );
}

function IndustriesView({ categories, selectedCategory, onSelectCategory, categoryVacancies, onSelectVacancy }: {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  categoryVacancies: Vacancy[];
  onSelectVacancy: (v: Vacancy) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-bold text-gray-900 mb-1">Sənaye sahələri</h2>
        <p className="text-sm text-gray-500 mb-3">Sənaye sahəsini seçin və uyğun elanları görün</p>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left',
                selectedCategory === cat.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  selectedCategory === cat.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                )}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className={cn('text-sm font-medium', selectedCategory === cat.id ? 'text-primary-700' : 'text-gray-700')}>
                  {cat.name_az}
                </span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', selectedCategory === cat.id && 'rotate-180')} />
            </button>
          ))}
        </div>
      </div>

      {selectedCategory && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Seçilmiş sənaye üzrə elanlar</h3>
          </div>
          {categoryVacancies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {categoryVacancies.map((v) => (
                <VacancyRow key={v.id} vacancy={v} onClick={() => onSelectVacancy(v)} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">Bu sənaye sahəsində aktiv vakansiya yoxdur.</div>
          )}
        </div>
      )}
    </div>
  );
}

function CompaniesView({ companies, selectedCompany, onSelectCompany, companyVacancies, onSelectVacancy }: {
  companies: Company[];
  selectedCompany: string;
  onSelectCompany: (id: string) => void;
  companyVacancies: Vacancy[];
  onSelectVacancy: (v: Vacancy) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-bold text-gray-900 mb-1">Şirkətlər</h2>
        <p className="text-sm text-gray-500 mb-3">Şirkət seçin və aktiv elanlarını görün</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCompany(c.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                selectedCompany === c.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-gray-50 border border-transparent'
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
                {c.company_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold line-clamp-1', selectedCompany === c.id ? 'text-primary-700' : 'text-gray-900')}>
                  {c.company_name}
                </p>
                {c.is_verified && (
                  <p className="text-xs text-success-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Təsdiqlənmiş
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
        {companies.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-6">Hal-hazırda aktiv şirkət yoxdur.</p>
        )}
      </div>

      {selectedCompany && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Şirkətin aktiv elanları</h3>
          </div>
          {companyVacancies.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {companyVacancies.map((v) => (
                <VacancyRow key={v.id} vacancy={v} onClick={() => onSelectVacancy(v)} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">Bu şirkətin aktiv vakansiyası yoxdur.</div>
          )}
        </div>
      )}
    </div>
  );
}

function CVView({ candidates, loading, isEmployer, hasSearch }: {
  candidates: Candidate[];
  loading: boolean;
  isEmployer: boolean;
  hasSearch: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">CV tapılmadı</h3>
        <p className="text-gray-500">
          {hasSearch ? 'Axtarış filtrinizi dəyişdirərək yenidən cəhd edin.' : 'Hal-hazırda görünür CV yoxdur.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{candidates.length} namizəd tapıldı</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {candidates.map((c) => (
          <CandidateCardInline key={c.id} candidate={c} isEmployer={isEmployer} />
        ))}
      </div>
    </div>
  );
}

function CandidateCardInline({ candidate, isEmployer }: { candidate: Candidate; isEmployer: boolean }) {
  const fullName = `${candidate.first_name} ${candidate.last_name} ${candidate.patronymic}`;
  const initials = `${candidate.first_name[0] || ''}${candidate.last_name[0] || ''}`.toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {isEmployer ? fullName : `${candidate.first_name} ${candidate.last_name}`}
          </h3>
          {candidate.profession && (
            <p className="text-sm text-primary-600 font-medium truncate">{candidate.profession}</p>
          )}
        </div>
      </div>

      {candidate.bio && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{candidate.bio}</p>}

      <div className="space-y-1 text-xs text-gray-500">
        {candidate.city && (
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {candidate.city.name_az}</div>
        )}
        {candidate.experience_years !== null && (
          <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-gray-400" /> {candidate.experience_years} il təcrübə</div>
        )}
        {candidate.skills && (
          <div className="flex items-start gap-1.5"><FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5" /> <span className="line-clamp-1">{candidate.skills}</span></div>
        )}
      </div>

      {candidate.cv_file_path && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {isEmployer ? (
            <DownloadCVButtonInline path={candidate.cv_file_path} />
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400"><FileText className="w-3.5 h-3.5" /> CV mövcuddur</div>
          )}
        </div>
      )}

      {isEmployer && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-600">
          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {candidate.email}</div>
          <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {candidate.phone}</div>
        </div>
      )}
    </div>
  );
}

function DownloadCVButtonInline({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  async function handleDownload() {
    setLoading(true);
    const { data } = await supabase.storage.from('cvs').createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, '_blank');
    setLoading(false);
  }
  return (
    <button onClick={handleDownload} disabled={loading} className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
      <Download className="w-4 h-4" /> {loading ? 'Açılır...' : 'CV-ni yüklə'}
    </button>
  );
}

function PricingInline({ settings }: { settings: AdminSettings | null }) {
  const standardPrice = settings?.standard_vacancy_price ?? 15;
  const premiumPrice = settings?.premium_vacancy_price ?? 20;
  const freeQuota = settings?.free_quota_per_month ?? 2;
  const duration = settings?.vacancy_duration_days ?? 30;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Qiymətlər və paketlər</h2>
        <p className="text-sm text-gray-500 mb-4">İş elanlarınızı effektiv şəkildə yayınlayın</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Free */}
          <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-success-100 text-success-600 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Pulsuz</h3>
            <div className="my-2">
              <span className="text-2xl font-bold text-gray-900">0 AZN</span>
              <p className="text-xs text-gray-500">{freeQuota} vakansiya / ay</p>
            </div>
            <ul className="space-y-1 text-xs text-left mb-3">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> Standart vakansiya</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> {duration} gün aktiv</li>
            </ul>
          </div>

          {/* Standard */}
          <div className="bg-white rounded-xl p-4 text-center border-2 border-primary-200">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Standart</h3>
            <div className="my-2">
              <span className="text-2xl font-bold text-primary-700">{standardPrice.toFixed(0)} AZN</span>
              <p className="text-xs text-gray-500">{duration} gün üçün</p>
            </div>
            <ul className="space-y-1 text-xs text-left mb-3">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> Standart vakansiya</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> {duration} gün aktiv</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> Bütün filtrlərdə görünür</li>
            </ul>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-xl p-4 text-center ring-2 ring-accent-200 relative">
            <span className="badge bg-accent-500 text-white px-2 py-0.5 text-xs absolute -top-2 left-1/2 -translate-x-1/2">
              <Star className="w-3 h-3 fill-white" /> Məşhur
            </span>
            <div className="w-10 h-10 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center mx-auto mb-3">
              <Star className="w-5 h-5 fill-accent-500" />
            </div>
            <h3 className="font-bold text-gray-900">Premium</h3>
            <div className="my-2">
              <span className="text-2xl font-bold text-accent-600">{premiumPrice.toFixed(0)} AZN</span>
              <p className="text-xs text-gray-500">{duration} gün üçün</p>
            </div>
            <ul className="space-y-1 text-xs text-left mb-3">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> Premium vakansiya</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> {duration} gün aktiv</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success-500" /> Siyahıda üst sırada</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Shield, title: `${freeQuota} pulsuz elan`, desc: `Hər ay ${freeQuota} vakansiya pulsuzdur` },
            { icon: Calendar, title: `${duration} gün aktiv`, desc: 'Hər elan aktiv qalır' },
            { icon: TrendingUp, title: 'Geniş auditoriya', desc: 'Minlərlə namizədə çatın' },
            { icon: Zap, title: 'Tez dərc', desc: 'Ödəniş təsdiqlənən kimi' },
          ].map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-2">
                <f.icon className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-gray-900 text-xs">{f.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VacancyDetailInline({ vacancy, onApply, onClose }: { vacancy: Vacancy; onApply: () => void; onClose: () => void }) {
  const isPremium = vacancy.vacancy_type === 'premium';
  const daysLeft = daysUntilExpiry(vacancy.expires_at);
  const isExpired = vacancy.status === 'expired' || (daysLeft !== null && daysLeft < 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isPremium && (
              <span className="badge bg-accent-100 text-accent-700">
                <Star className="w-3 h-3 fill-accent-500" /> Premium
              </span>
            )}
            <span className="badge bg-primary-50 text-primary-700">{vacancy.employment_type}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 shrink-0" aria-label="Bağla">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-2">{vacancy.title}</h2>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
            {vacancy.company?.company_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{vacancy.company?.company_name}</p>
            {vacancy.company?.is_verified && (
              <p className="text-xs text-success-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Təsdiqlənmiş
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          {vacancy.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {vacancy.city.name_az}{vacancy.subregion ? `, ${vacancy.subregion}` : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            {formatSalary(vacancy.salary_min, vacancy.salary_max, vacancy.salary_visible, vacancy.salary_currency)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(vacancy.published_at)}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
        {vacancy.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">İş təsviri</h3>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{vacancy.description}</p>
          </div>
        )}
        {vacancy.responsibilities && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Vəzifə öhdəlikləri</h3>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{vacancy.responsibilities}</p>
          </div>
        )}
        {vacancy.requirements && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Tələblər</h3>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{vacancy.requirements}</p>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Əlaqə</h3>
          <div className="space-y-1.5 text-xs text-gray-700">
            {vacancy.contact_person && (
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" /> {vacancy.contact_person}</div>
            )}
            {vacancy.contact_email && (
              <a href={`mailto:${vacancy.contact_email}`} className="flex items-center gap-2 hover:text-primary-700">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> {vacancy.contact_email}
              </a>
            )}
            {vacancy.contact_phone && (
              <a href={`tel:${vacancy.contact_phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-primary-700">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> {vacancy.contact_phone}
              </a>
            )}
          </div>
        </div>

        {(vacancy.experience_min !== null || vacancy.education) && (
          <div className="pt-3 border-t border-gray-100">
            <dl className="space-y-1.5 text-xs">
              {vacancy.experience_min !== null && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Təcrübə</dt>
                  <dd className="font-medium text-gray-900">{vacancy.experience_min}+ il</dd>
                </div>
              )}
              {vacancy.education && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Təhsil</dt>
                  <dd className="font-medium text-gray-900">{vacancy.education}</dd>
                </div>
              )}
              {daysLeft !== null && daysLeft >= 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Müddət</dt>
                  <dd className="font-medium text-amber-600">{daysLeft} gün qalıb</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onApply}
          disabled={isExpired}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all',
            isExpired ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'
          )}
        >
          <Send className="w-4 h-4" />
          {isExpired ? 'Müraciət bağlıdır' : 'Müraciət et'}
        </button>
      </div>
    </div>
  );
}

function ApplyModal({ vacancy, copied, onCopy, onClose }: { vacancy: Vacancy; copied: boolean; onCopy: (email: string) => void; onClose: () => void }) {
  const dialogRef = useModalAccessibility(true, onClose);
  const applyEmail = vacancy.contact_email || vacancy.company?.contact_email || '';
  const mailtoLink = applyEmail ? `mailto:${applyEmail}?subject=${encodeURIComponent('Müraciət: ' + vacancy.title)}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="CV ilə müraciət" tabIndex={-1} className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-down">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary-600" /> CV ilə müraciət
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Bağla">
            <X className="w-5 h-5" />
          </button>
        </div>

        {applyEmail ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">CV faylınızı aşağıdaki e-poçt ünvanına göndərin:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">E-poçt ünvanı:</p>
              <div className="flex items-center gap-2 flex-wrap">
                <a href={mailtoLink} className="text-primary-700 font-medium hover:underline break-all flex-1 min-w-0" onDoubleClick={() => onCopy(applyEmail)}>
                  {applyEmail}
                </a>
                <button onClick={() => onCopy(applyEmail)} className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors" title="Kopyala">
                  {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {copied && (
              <div className="flex items-center gap-2 text-sm text-success-600 bg-success-50 border border-success-200 rounded-lg p-2.5">
                <Check className="w-4 h-4" /> E-poçt ünvanı kopyalandı
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <a href={mailtoLink} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">
                <Mail className="w-4 h-4" /> E-poçt aç
              </a>
              <button onClick={() => onCopy(applyEmail)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>CV faylınızı e-poçta özünüz əlavə edin. Mövzu sətrində vakansiyanın adı avtomatik göstərilir.</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 text-sm">CV göndərmək üçün e-poçt ünvanı qeyd edilməyib.</p>
          </div>
        )}
      </div>
    </div>
  );
}
