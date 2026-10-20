import { useEffect, useState, FormEvent } from 'react';
import { MessageSquare, Plus, Send, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Vacancy, VacancyEditRequest, EditRequestType } from '@/types';
import { EDIT_REQUEST_STATUS_LABELS, EDIT_REQUEST_TYPE_LABELS, VACANCY_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function EditRequests() {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [requests, setRequests] = useState<VacancyEditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    vacancy_id: '',
    request_type: 'correction' as EditRequestType,
    requested_changes: '',
  });

  useEffect(() => {
    if (!user?.company?.id) { setLoading(false); return; }
    async function load() {
      if (!user?.company?.id) return;
      const companyId = user.company.id;
      const [vacRes, reqRes] = await Promise.all([
        supabase.from('vacancies').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('vacancy_edit_requests').select('*, vacancy:vacancies(*)').eq('company_id', companyId).order('created_at', { ascending: false }),
      ]);
      setVacancies((vacRes.data as unknown as Vacancy[]) || []);
      setRequests((reqRes.data as unknown as VacancyEditRequest[]) || []);
      setLoading(false);
    }
    load();
  }, [user?.company?.id]);

  // Only published vacancies can have edit requests
  const publishedVacancies = vacancies.filter(v => v.status === 'active' || v.status === 'expired' || v.status === 'suspended');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.vacancy_id) { setError('Vakansiya seçin.'); return; }
    if (!form.requested_changes.trim()) { setError('Dəyişiklik tələbini izah edin.'); return; }
    if (!user?.company?.id) return;

    setSubmitting(true);
    const { error: insertError } = await supabase.from('vacancy_edit_requests').insert({
      vacancy_id: form.vacancy_id,
      company_id: user.company.id,
      request_type: form.request_type,
      requested_changes: form.requested_changes.trim(),
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setShowForm(false);
      setForm({ vacancy_id: '', request_type: 'correction', requested_changes: '' });
      // Reload
      const { data } = await supabase
        .from('vacancy_edit_requests')
        .select('*, vacancy:vacancies(*)')
        .eq('company_id', user.company.id)
        .order('created_at', { ascending: false });
      setRequests((data as unknown as VacancyEditRequest[]) || []);
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sorğular</h1>
          <p className="text-sm text-gray-500 mt-1">Dərc olunmuş vakansiyalar üçün düzəliş sorğuları</p>
        </div>
        {publishedVacancies.length > 0 && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Yeni sorğu
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vakansiya *</label>
            <select value={form.vacancy_id} onChange={e => setForm(prev => ({ ...prev, vacancy_id: e.target.value }))} className="input-field">
              <option value="">Seçin</option>
              {publishedVacancies.map(v => (
                <option key={v.id} value={v.id}>{v.title} ({VACANCY_STATUS_LABELS[v.status]})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sorğu tipi *</label>
            <select value={form.request_type} onChange={e => setForm(prev => ({ ...prev, request_type: e.target.value as EditRequestType }))} className="input-field">
              {Object.entries(EDIT_REQUEST_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dəyişiklik izahı *</label>
            <textarea
              value={form.requested_changes}
              onChange={e => setForm(prev => ({ ...prev, requested_changes: e.target.value }))}
              rows={4}
              className="input-field resize-y"
              placeholder="Hansı dəyişikliklər lazım olduğunu ətraflı izah edin..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Ləğv et</button>
            <button type="submit" disabled={submitting} className="btn-primary text-sm flex items-center gap-2">
              <Send className="w-4 h-4" /> {submitting ? 'Göndərilir...' : 'Göndər'}
            </button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Hələ sorğu yoxdur.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">{r.vacancy?.title || 'Vakansiya'}</h3>
                    <span className="badge bg-gray-100 text-gray-600 text-xs">
                      {EDIT_REQUEST_TYPE_LABELS[r.request_type]}
                    </span>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
