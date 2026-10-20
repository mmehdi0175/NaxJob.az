import { useEffect, useState, FormEvent } from 'react';
import { Save, CheckCircle2, AlertCircle, DollarSign, Clock, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminSettings } from '@/types';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    standard_vacancy_price: '15',
    premium_vacancy_price: '20',
    vacancy_duration_days: '30',
    free_quota_per_month: '2',
    payment_test_mode: true,
    payment_provider: 'test',
  });

  useEffect(() => {
    supabase.from('admin_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        const s = data as AdminSettings;
        setSettings(s);
        setForm({
          standard_vacancy_price: String(s.standard_vacancy_price),
          premium_vacancy_price: String(s.premium_vacancy_price),
          vacancy_duration_days: String(s.vacancy_duration_days),
          free_quota_per_month: String(s.free_quota_per_month),
          payment_test_mode: s.payment_test_mode,
          payment_provider: s.payment_provider,
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!settings) return;

    const stdPrice = parseFloat(form.standard_vacancy_price);
    const premPrice = parseFloat(form.premium_vacancy_price);
    const duration = parseInt(form.vacancy_duration_days);
    const quota = parseInt(form.free_quota_per_month);

    if (isNaN(stdPrice) || stdPrice < 0) { setError('Standart qiymət düzgün deyil.'); return; }
    if (isNaN(premPrice) || premPrice < 0) { setError('Premium qiymət düzgün deyil.'); return; }
    if (isNaN(duration) || duration < 1) { setError('Müddət 1 gündən az ola bilməz.'); return; }
    if (isNaN(quota) || quota < 0) { setError('Pulsuz kvota düzgün deyil.'); return; }

    setSaving(true);
    const adminId = (await supabase.auth.getUser()).data.user?.id;
    const { error: updateError } = await supabase.from('admin_settings').update({
      standard_vacancy_price: stdPrice,
      premium_vacancy_price: premPrice,
      vacancy_duration_days: duration,
      free_quota_per_month: quota,
      payment_test_mode: form.payment_test_mode,
      payment_provider: form.payment_provider,
      updated_by: adminId,
    }).eq('id', settings.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      await supabase.from('admin_actions').insert({
        admin_id: adminId,
        action_type: 'update_settings',
        target_type: 'settings',
        details: { standard: stdPrice, premium: premPrice, duration, quota, test_mode: form.payment_test_mode },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-sm text-gray-500 mt-1">Qiymətlər, kvota və ödəniş konfiqurasiyası</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-success-50 border border-success-200 p-3 text-sm text-success-700">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>Ayarlar uğurla saxlanıldı!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Pricing */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" /> Qiymətlər
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standart vakansiya (AZN)</label>
              <input type="number" step="0.01" value={form.standard_vacancy_price} onChange={e => setForm(prev => ({ ...prev, standard_vacancy_price: e.target.value }))} className="input-field" disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Premium vakansiya (AZN)</label>
              <input type="number" step="0.01" value={form.premium_vacancy_price} onChange={e => setForm(prev => ({ ...prev, premium_vacancy_price: e.target.value }))} className="input-field" disabled={saving} />
            </div>
          </div>
        </div>

        {/* Duration & Quota */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" /> Müddət və Kvota
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Elan müddəti (gün)</label>
              <input type="number" value={form.vacancy_duration_days} onChange={e => setForm(prev => ({ ...prev, vacancy_duration_days: e.target.value }))} className="input-field" disabled={saving} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Gift className="w-4 h-4" /> Pulsuz kvota (ay)
              </label>
              <input type="number" value={form.free_quota_per_month} onChange={e => setForm(prev => ({ ...prev, free_quota_per_month: e.target.value }))} className="input-field" disabled={saving} />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" /> Ödəniş sistemi
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödəniş provideri</label>
              <select value={form.payment_provider} onChange={e => setForm(prev => ({ ...prev, payment_provider: e.target.value }))} className="input-field" disabled={saving}>
                <option value="test">Test rejimi</option>
                <option value="kapital">Kapital Bank</option>
                <option value="birbank">BirBank</option>
                <option value="azevo">AzeriCard</option>
                <option value="other">Digər</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.payment_test_mode}
                onChange={e => setForm(prev => ({ ...prev, payment_test_mode: e.target.checked }))}
                className="text-primary-600 focus:ring-primary-500 rounded"
                disabled={saving}
              />
              Test rejimi (real ödəniş həyata keçirilmir)
            </label>
            {form.payment_test_mode && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Test rejimi aktivdir</p>
                  <p>Real ödəniş providerinin açarları konfiqurasiya edildikdən sonra test rejimini söndürün.</p>
                  <p className="mt-1 text-xs">Tələb olunan environment dəyişənləri: PAYMENT_API_KEY, PAYMENT_MERCHANT_ID, PAYMENT_CALLBACK_URL</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-5 h-5" /> {saving ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      </form>
    </div>
  );
}
