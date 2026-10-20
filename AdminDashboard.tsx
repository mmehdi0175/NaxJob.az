import { useEffect, useState } from 'react';
import { FileText, Building2, DollarSign, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AdminStats {
  activeVacancies: number;
  pendingVacancies: number;
  totalCompanies: number;
  monthlyRevenue: number;
  expiringCount: number;
  totalVacancies: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    activeVacancies: 0, pendingVacancies: 0, totalCompanies: 0,
    monthlyRevenue: 0, expiringCount: 0, totalVacancies: 0,
  });
  const [recentVacancies, setRecentVacancies] = useState<{ id: string; title: string; status: string; created_at: string; company?: { company_name: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await supabase.rpc('expire_old_vacancies');

      const [activeRes, pendingRes, compRes, payRes, expiringRes, totalRes, recentRes] = await Promise.all([
        supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'pending_payment'),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('amount').eq('status', 'confirmed').gte('confirmed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('vacancies').select('id', { count: 'exact', head: true }).eq('status', 'active').lte('expires_at', new Date(Date.now() + 3 * 86400000).toISOString()),
        supabase.from('vacancies').select('id', { count: 'exact', head: true }),
        supabase.from('vacancies').select('id, title, status, created_at, company:companies(company_name)').order('created_at', { ascending: false }).limit(8),
      ]);

      const monthlyRevenue = (payRes.data || []).reduce((sum, p) => sum + (p as { amount: number }).amount, 0);

      setStats({
        activeVacancies: activeRes.count || 0,
        pendingVacancies: pendingRes.count || 0,
        totalCompanies: compRes.count || 0,
        monthlyRevenue,
        expiringCount: expiringRes.count || 0,
        totalVacancies: totalRes.count || 0,
      });
      setRecentVacancies((recentRes.data as unknown as typeof recentVacancies) || []);
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { label: 'Aktiv vakansiya', value: stats.activeVacancies, icon: FileText, color: 'text-success-600 bg-success-50' },
    { label: 'Ödəniş gözləyən', value: stats.pendingVacancies, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Şirkət', value: stats.totalCompanies, icon: Building2, color: 'text-primary-600 bg-primary-50' },
    { label: 'Aylıq gəlir', value: formatPrice(stats.monthlyRevenue), icon: DollarSign, color: 'text-accent-600 bg-accent-50' },
  ];

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">İdarəetmə paneli</h1>
        <p className="text-sm text-gray-500 mt-1">Ümumi statistika və vəziyyət</p>
      </div>

      {/* Stat cards */}
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

      {/* Expiring alert */}
      {stats.expiringCount > 0 && (
        <div className="card p-4 flex items-center gap-3 border-amber-200 bg-amber-50/50">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-gray-700">
            <strong>{stats.expiringCount}</strong> vakansiya yaxın 3 gün ərzində bitəcək.
          </p>
        </div>
      )}

      {/* Recent vacancies */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Son vakansiyalar</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vakansiya</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Şirkət</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tarix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentVacancies.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Vakansiya yoxdur</td></tr>
              ) : (
                recentVacancies.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]">{v.title}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{v.company?.company_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-gray-100 text-gray-600 capitalize">{v.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(v.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
