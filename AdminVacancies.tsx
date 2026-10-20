import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Vacancy } from '@/types';
import { VACANCY_STATUS_LABELS, VACANCY_STATUS_COLORS } from '@/lib/constants';
import { formatSalary, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'pending_payment' | 'expired' | 'rejected' | 'suspended' | 'removed' | 'draft';

const PAGE_SIZE = 15;

export default function AdminVacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVacancies = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('vacancies')
      .select('*, company:companies(*), category:categories(*), city:cities(*)', { count: 'exact' });

    if (search) query = query.ilike('title', `%${search}%`);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const from = (page - 1) * PAGE_SIZE;
    query = query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    const { data, count } = await query;
    setVacancies((data as unknown as Vacancy[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { fetchVacancies(); }, [fetchVacancies]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  async function updateStatus(vacancyId: string, status: string, note?: string) {
    setActionLoading(vacancyId);
    const updateData: Record<string, unknown> = { status, admin_note: note || null };
    if (status === 'active') {
      // If activating from pending, set published_at and expires_at
      const { data: vac } = await supabase.from('vacancies').select('published_at, expires_at').eq('id', vacancyId).maybeSingle();
      if (vac && !vac.published_at) {
        const now = new Date();
        const expires = new Date(now.getTime() + 30 * 86400000);
        updateData.published_at = now.toISOString();
        updateData.expires_at = expires.toISOString();
      }
    }
    await supabase.from('vacancies').update(updateData).eq('id', vacancyId);
    await supabase.from('admin_actions').insert({
      admin_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: `${status}_vacancy`,
      target_type: 'vacancy',
      target_id: vacancyId,
      details: { note: note || null },
    });
    setActionLoading(null);
    fetchVacancies();
  }

  async function togglePremium(vacancyId: string, currentType: string) {
    setActionLoading(vacancyId);
    const newType = currentType === 'premium' ? 'standard' : 'premium';
    await supabase.from('vacancies').update({ vacancy_type: newType }).eq('id', vacancyId);
    setActionLoading(null);
    fetchVacancies();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Hamısı' },
    { value: 'active', label: 'Aktiv' },
    { value: 'pending_payment', label: 'Ödəniş gözləyir' },
    { value: 'draft', label: 'Qaralama' },
    { value: 'expired', label: 'Müddəti bitib' },
    { value: 'rejected', label: 'Rədd edilib' },
    { value: 'suspended', label: 'Dayandırılıb' },
    { value: 'removed', label: 'Silinib' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Vakansiyalar</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Vakansiya adı ilə axtar..."
            className="input-field pl-10"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="input-field sm:w-48">
          {filters.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <p className="text-sm text-gray-500">{total} vakansiya</p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      ) : vacancies.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">Vakansiya tapılmadı.</div>
      ) : (
        <>
          <div className="space-y-3">
            {vacancies.map((v) => (
              <div key={v.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{v.title}</h3>
                      <span className={cn('badge text-xs', VACANCY_STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600')}>
                        {VACANCY_STATUS_LABELS[v.status] || v.status}
                      </span>
                      {v.vacancy_type === 'premium' && <span className="badge bg-accent-100 text-accent-700 text-xs">Premium</span>}
                      {v.is_free_quota && <span className="badge bg-success-100 text-success-700 text-xs">Pulsuz</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{v.company?.company_name}</span>
                      {v.city && <span>{v.city.name_az}</span>}
                      {v.category && <span>{v.category.name_az}</span>}
                      <span>{formatSalary(v.salary_min, v.salary_max, v.salary_visible)}</span>
                      <span>{formatDate(v.published_at || v.created_at)}</span>
                      <span>{v.employment_type}</span>
                      <span>Baxış: {v.views_count}</span>
                    </div>
                    {v.admin_note && (
                      <p className="text-xs text-red-600 mt-1">Admin qeydi: {v.admin_note}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <Link to={`/vakansiya/${v.id}`} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Bax">
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    {v.status === 'pending_payment' && (
                      <button
                        onClick={() => updateStatus(v.id, 'active')}
                        disabled={actionLoading === v.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-600 text-white hover:bg-success-700 disabled:opacity-50"
                      >
                        Təsdiqlə
                      </button>
                    )}
                    {v.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateStatus(v.id, 'suspended', 'Admin tərəfindən dayandırılıb')}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                          Dayandır
                        </button>
                        <button
                          onClick={() => updateStatus(v.id, 'removed', 'Admin tərəfindən silinib')}
                          disabled={actionLoading === v.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Sil
                        </button>
                      </>
                    )}
                    {v.status === 'suspended' && (
                      <button
                        onClick={() => updateStatus(v.id, 'active')}
                        disabled={actionLoading === v.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-600 text-white hover:bg-success-700 disabled:opacity-50"
                      >
                        Bərpa et
                      </button>
                    )}
                    {v.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(v.id, 'active')}
                        disabled={actionLoading === v.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        Dərc et
                      </button>
                    )}
                    {(v.status === 'active' || v.status === 'suspended') && (
                      <button
                        onClick={() => togglePremium(v.id, v.vacancy_type)}
                        disabled={actionLoading === v.id}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50',
                          v.vacancy_type === 'premium'
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-accent-500 text-white hover:bg-accent-600'
                        )}
                      >
                        {v.vacancy_type === 'premium' ? 'Standart et' : 'Premium et'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
