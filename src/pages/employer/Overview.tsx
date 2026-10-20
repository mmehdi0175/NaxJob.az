import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle2, Clock, XCircle, TrendingUp, Plus, AlertCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Vacancy, AdminSettings } from '@/types';
import { VACANCY_STATUS_LABELS, VACANCY_STATUS_COLORS } from '@/lib/constants';
import { formatSalary, formatDate, daysUntilExpiry } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DashboardStats {
  total: number;
  active: number;
  pending: number;
  expired: number;
  freeQuotaUsed: number;
}

export default function Overview() {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, pending: 0, expired: 0, freeQuotaUsed: 0 });
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company?.id) { setLoading(false); return; }
    async function load() {
      if (!user?.company?.id) return;
      const companyId = user.company.id;
      const [vacRes, setRes] = await Promise.all([
        supabase
          .from('vacancies')
          .select('*, category:categories(*), city:cities(*)')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),
        supabase.from('admin_settings').select('*').limit(1).maybeSingle(),
      ]);

      const vacs = (vacRes.data as unknown as Vacancy[]) || [];
      setVacancies(vacs);
      const freeUsed = vacs.filter(v => v.is_free_quota && dateInCurrentMonth(v.created_at)).length;
      setStats({
        total: vacs.length,
        active: vacs.filter(v => v.status === 'active').length,
        pending: vacs.filter(v => v.status === 'pending_payment' || v.status === 'draft').length,
        expired: vacs.filter(v => v.status === 'expired' || v.status === 'rejected' || v.status === 'suspended').length,
        freeQuotaUsed: freeUsed,
      });
      if (setRes.data) setSettings(setRes.data as AdminSettings);
      setLoading(false);
    }
    load();
  }, [user?.company?.id]);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  if (!user?.company) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Şirkət profili tamamlanmayıb</h2>
        <p className="text-gray-500 mb-4">Vakansiya yerləşdirmək üçün əvvəlcə profilinizi tamamlayın.</p>
        <Link to="/employer/dashboard/profil" className="btn-primary">Profilimi tamamla</Link>
      </div>
    );
  }

  const freeQuota = settings?.free_quota_per_month ?? 2;
  const freeRemaining = Math.max(0, freeQuota - stats.freeQuotaUsed);

  const statCards = [
    { label: 'Ümumi vakansiya', value: stats.total, icon: FileText, color: 'text-primary-600 bg-primary-50' },
    { label: 'Aktiv', value: stats.active, icon: CheckCircle2, color: 'text-success-600 bg-success-50' },
    { label: 'Gözləyir', value: stats.pending, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Bitmiş/Rədd', value: stats.expired, icon: XCircle, color: 'text-gray-500 bg-gray-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ümumi baxış</h1>
          <p className="text-sm text-gray-500 mt-1">{user.company.company_name}</p>
        </div>
        <Link to="/employer/dashboard/yeni-vakansiya" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Yeni vakansiya
        </Link>
      </div>

      {/* Free quota banner */}
      <div className={cn(
        'card p-5 flex items-center gap-4',
        freeRemaining > 0 ? 'border-success-200 bg-success-50/50' : 'border-amber-200 bg-amber-50/50'
      )}>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          freeRemaining > 0 ? 'bg-success-100 text-success-600' : 'bg-amber-100 text-amber-600'
        )}>
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Pulsuz elan kvotası</h3>
          <p className="text-sm text-gray-600">
            {freeRemaining > 0
              ? `Bu ay ${freeRemaining} pulsuz elan hüququnuz qalıb (${stats.freeQuotaUsed}/${freeQuota} istifadə edilib).`
              : `Bu ay pulsuz elan kvotanız bitmişdir (${freeQuota}/${freeQuota}). Digər elanlar ödənişlidir.`}
          </p>
        </div>
        {freeRemaining === 0 && (
          <Link to="/employer/dashboard/yeni-vakansiya" className="btn-accent text-sm whitespace-nowrap">
            Ödənişli elan
          </Link>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent vacancies */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Son vakansiyalar</h2>
          <Link to="/employer/dashboard/vakansiyalar" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Hamısına bax
          </Link>
        </div>

        {vacancies.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Hələ vakansiya yoxdur</h3>
            <p className="text-gray-500 text-sm mb-4">İlk elanınızı yerləşdirərək başlayın.</p>
            <Link to="/employer/dashboard/yeni-vakansiya" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> İlk vakansiyamı yerləşdir
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vacancies.slice(0, 5).map((v) => {
              const daysLeft = daysUntilExpiry(v.expires_at);
              return (
                <div key={v.id} className="card p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{v.title}</h3>
                      <span className={cn('badge text-xs', VACANCY_STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600')}>
                        {VACANCY_STATUS_LABELS[v.status] || v.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-sm text-gray-500">
                      {v.city && <span>{v.city.name_az}</span>}
                      <span>{formatSalary(v.salary_min, v.salary_max, v.salary_visible)}</span>
                      <span>{formatDate(v.published_at || v.created_at)}</span>
                      {v.status === 'active' && daysLeft !== null && (
                        <span className="text-amber-600">{daysLeft} gün qalıb</span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/vakansiya/${v.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium shrink-0"
                  >
                    Bax
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function dateInCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
