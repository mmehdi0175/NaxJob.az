import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Eye, MessageSquare, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Vacancy, VacancyEditRequest } from '@/types';
import { VACANCY_STATUS_LABELS, VACANCY_STATUS_COLORS, EDIT_REQUEST_STATUS_LABELS } from '@/lib/constants';
import { formatSalary, formatDate, daysUntilExpiry } from '@/lib/format';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'active' | 'pending_payment' | 'draft' | 'expired' | 'rejected' | 'suspended';

export default function MyVacancies() {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [editRequests, setEditRequests] = useState<VacancyEditRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const loadVacancies = useCallback(async () => {
    if (!user?.company?.id) { setLoading(false); return; }
    const [vacRes, editRes] = await Promise.all([
      supabase
        .from('vacancies')
        .select('*, category:categories(*), city:cities(*)')
        .eq('company_id', user.company.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('vacancy_edit_requests')
        .select('*, vacancy:vacancies(*)')
        .eq('company_id', user.company.id)
        .order('created_at', { ascending: false }),
    ]);
    setVacancies((vacRes.data as unknown as Vacancy[]) || []);
    setEditRequests((editRes.data as unknown as VacancyEditRequest[]) || []);
    setLoading(false);
  }, [user?.company?.id]);

  useEffect(() => { loadVacancies(); }, [loadVacancies]);

  async function handleDelete(vacancyId: string) {
    const { error } = await supabase.from('vacancies').delete().eq('id', vacancyId);
    if (error) {
      alert('Silinmə zamanı xəta: ' + error.message);
    } else {
      loadVacancies();
    }
    setShowDeleteConfirm(null);
  }

  const filtered = filter === 'all' ? vacancies : vacancies.filter(v => v.status === filter);

  const filters: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all', label: 'Hamısı', count: vacancies.length },
    { value: 'active', label: 'Aktiv', count: vacancies.filter(v => v.status === 'active').length },
    { value: 'pending_payment', label: 'Ödəniş gözləyir', count: vacancies.filter(v => v.status === 'pending_payment').length },
    { value: 'draft', label: 'Qaralama', count: vacancies.filter(v => v.status === 'draft').length },
    { value: 'expired', label: 'Müddəti bitib', count: vacancies.filter(v => v.status === 'expired').length },
    { value: 'rejected', label: 'Rədd edilib', count: vacancies.filter(v => v.status === 'rejected').length },
  ];

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vakansiyalarım</h1>
        <Link to="/employer/dashboard/yeni-vakansiya" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Yeni vakansiya
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filter === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Bu kateqoriyada vakansiya yoxdur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const daysLeft = daysUntilExpiry(v.expires_at);
            const vacEditRequests = editRequests.filter(er => er.vacancy_id === v.id);
            const canDelete = v.status === 'draft' || v.status === 'pending_payment' || v.status === 'rejected';

            return (
              <div key={v.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{v.title}</h3>
                      <span className={cn('badge text-xs', VACANCY_STATUS_COLORS[v.status] || 'bg-gray-100 text-gray-600')}>
                        {VACANCY_STATUS_LABELS[v.status] || v.status}
                      </span>
                      {v.vacancy_type === 'premium' && (
                        <span className="badge bg-accent-100 text-accent-700 text-xs">Premium</span>
                      )}
                      {v.is_free_quota && (
                        <span className="badge bg-success-100 text-success-700 text-xs">Pulsuz kvota</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      {v.city && <span>{v.city.name_az}</span>}
                      {v.category && <span>{v.category.name_az}</span>}
                      <span>{formatSalary(v.salary_min, v.salary_max, v.salary_visible)}</span>
                      <span>{v.employment_type}</span>
                      <span>{formatDate(v.published_at || v.created_at)}</span>
                      {v.status === 'active' && daysLeft !== null && (
                        <span className="text-amber-600">{daysLeft} gün qalıb</span>
                      )}
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {v.views_count}</span>
                    </div>

                    {/* Admin note for rejected vacancies */}
                    {v.status === 'rejected' && v.admin_note && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Admin qeydi: {v.admin_note}</span>
                      </div>
                    )}

                    {/* Edit requests */}
                    {vacEditRequests.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        {vacEditRequests.map(er => (
                          <span key={er.id} className={cn(
                            'badge text-xs',
                            er.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            er.status === 'approved' ? 'bg-success-100 text-success-700' :
                            er.status === 'completed' ? 'bg-primary-100 text-primary-700' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            Sorğu: {EDIT_REQUEST_STATUS_LABELS[er.status]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/vakansiya/${v.id}`}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Bax"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {canDelete && (
                      <>
                        <button
                          onClick={() => setShowDeleteConfirm(v.id)}
                          className="p-2 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {showDeleteConfirm === v.id && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowDeleteConfirm(null)}>
                            <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                              <h3 className="font-semibold text-gray-900 mb-2">Vakansiyani silin?</h3>
                              <p className="text-sm text-gray-500 mb-4">Bu əməliyyat geri qaytarıla bilməz.</p>
                              <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary text-sm">Ləğv et</button>
                                <button onClick={() => handleDelete(v.id)} className="btn-danger text-sm">Sil</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
