import { useEffect, useState, useCallback, FormEvent } from 'react';
import { MessageSquare, Send, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { VacancyEditRequest } from '@/types';
import { EDIT_REQUEST_STATUS_LABELS, EDIT_REQUEST_TYPE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'completed';

export default function AdminEditRequests() {
  const [requests, setRequests] = useState<VacancyEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState<{ id: string; status: 'approved' | 'rejected' | 'completed'; response: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('vacancy_edit_requests')
      .select('*, vacancy:vacancies(title, status), company:companies(company_name)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data } = await query;
    setRequests((data as unknown as VacancyEditRequest[]) || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleResponse(e: FormEvent) {
    e.preventDefault();
    if (!responseForm) return;
    setActionLoading(responseForm.id);
    const adminId = (await supabase.auth.getUser()).data.user?.id;
    await supabase.from('vacancy_edit_requests').update({
      status: responseForm.status,
      admin_response: responseForm.response.trim(),
      handled_by: adminId,
      resolved_at: new Date().toISOString(),
    }).eq('id', responseForm.id);
    await supabase.from('admin_actions').insert({
      admin_id: adminId,
      action_type: `edit_request_${responseForm.status}`,
      target_type: 'edit_request',
      target_id: responseForm.id,
    });
    setActionLoading(null);
    setResponseForm(null);
    fetchRequests();
  }

  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Hamısı' },
    { value: 'pending', label: 'Gözləyən' },
    { value: 'approved', label: 'Təsdiqlənmiş' },
    { value: 'rejected', label: 'Rədd edilmiş' },
    { value: 'completed', label: 'Tamamlanmış' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sorğular</h1>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === f.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      ) : requests.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Sorğu tapılmadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">{r.vacancy?.title || 'Vakansiya'}</h3>
                    <span className="badge bg-gray-100 text-gray-600 text-xs">{EDIT_REQUEST_TYPE_LABELS[r.request_type]}</span>
                    <span className={cn('badge text-xs',
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'approved' ? 'bg-success-100 text-success-700' :
                      r.status === 'completed' ? 'bg-primary-100 text-primary-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {EDIT_REQUEST_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{r.requested_changes}</p>
                  <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
                  {r.admin_response && (
                    <div className="mt-2 flex items-start gap-2 text-sm bg-primary-50 rounded-lg p-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                      <span><strong>Admin cavabı:</strong> {r.admin_response}</span>
                    </div>
                  )}
                </div>

                {r.status === 'pending' && !responseForm && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setResponseForm({ id: r.id, status: 'approved', response: '' })}
                      disabled={actionLoading === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success-600 text-white hover:bg-success-700 disabled:opacity-50"
                    >
                      Təsdiqlə
                    </button>
                    <button
                      onClick={() => setResponseForm({ id: r.id, status: 'rejected', response: '' })}
                      disabled={actionLoading === r.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Rədd et
                    </button>
                  </div>
                )}
              </div>

              {responseForm?.id === r.id && (
                <form onSubmit={handleResponse} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <textarea
                    value={responseForm.response}
                    onChange={e => setResponseForm(prev => prev ? { ...prev, response: e.target.value } : null)}
                    rows={3}
                    className="input-field text-sm resize-y"
                    placeholder="Cavabınızı yazın (istəyə bağlı)..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setResponseForm(null)} className="btn-secondary text-sm">Ləğv et</button>
                    <button
                      type="submit"
                      disabled={actionLoading === r.id}
                      className={cn(
                        'inline-flex font-medium rounded-lg px-5 py-2.5 transition-all duration-200 text-sm items-center gap-1.5 text-white',
                        responseForm.status === 'approved' ? 'bg-success-600 hover:bg-success-700' : 'bg-red-600 hover:bg-red-700'
                      )}
                    >
                      <Send className="w-4 h-4" />
                      {responseForm.status === 'approved' ? 'Təsdiqlə' : 'Rədd et'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
