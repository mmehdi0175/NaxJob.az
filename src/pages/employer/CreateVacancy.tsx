import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Check, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLookupData } from '@/hooks/useLookupData';
import { supabase } from '@/lib/supabase';
import type { AdminSettings, VacancyType } from '@/types';
import { EMPLOYMENT_TYPES, EDUCATION_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function CreateVacancy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories, regions } = useLookupData();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [freeQuotaUsed, setFreeQuotaUsed] = useState(0);

  const [form, setForm] = useState({
    title: '',
    category_id: '',
    city_id: '',
    subregion: '',
    description: '',
    requirements: '',
    responsibilities: '',
    salary_min: '',
    salary_max: '',
    salary_visible: true,
    employment_type: 'Tam ştat',
    experience_min: '0',
    education: 'Vacib deyil',
    contact_person: '',
    contact_email: user?.company?.contact_email || '',
    contact_phone: user?.company?.contact_phone || '',
    vacancy_type: 'standard' as VacancyType,
  });

  useEffect(() => {
    supabase.from('admin_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as AdminSettings);
    });
  }, []);

  useEffect(() => {
    if (!user?.company?.id) return;
    async function checkQuota() {
      if (!user?.company?.id) return;
      const { data } = await supabase.rpc('get_employer_monthly_vacancy_count', { p_company_id: user.company!.id });
      setFreeQuotaUsed(data || 0);
    }
    checkQuota();
  }, [user?.company?.id]);

  const freeQuota = settings?.free_quota_per_month ?? 2;
  const freeRemaining = Math.max(0, freeQuota - freeQuotaUsed);
  const canUseFree = freeRemaining > 0;
  const standardPrice = settings?.standard_vacancy_price ?? 15;
  const premiumPrice = settings?.premium_vacancy_price ?? 20;
  const durationDays = settings?.vacancy_duration_days ?? 30;

  const isFreeChoice = form.vacancy_type === 'standard' && canUseFree;
  const paymentAmount = form.vacancy_type === 'premium' ? premiumPrice : standardPrice;
  const needsPayment = !isFreeChoice;

  function update(key: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!user?.company?.id) {
      setError('Şirkət profili tapılmadı.');
      return;
    }
    if (!form.title.trim()) { setError('Vakansiya adı tələb olunur.'); return; }
    if (!form.description.trim()) { setError('İş təsviri tələb olunur.'); return; }
    if (!form.category_id) { setError('Kateqoriya seçin.'); return; }
    if (!form.city_id) { setError('Şəhər seçin.'); return; }

    setLoading(true);

    const { data: vacancyId, error: rpcError } = await supabase.rpc('publish_free_vacancy', {
      p_title: form.title.trim(),
      p_description: form.description.trim(),
      p_category_id: form.category_id,
      p_city_id: form.city_id,
      p_requirements: form.requirements.trim(),
      p_responsibilities: form.responsibilities.trim(),
      p_salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
      p_salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
      p_salary_visible: form.salary_visible,
      p_employment_type: form.employment_type,
      p_experience_min: parseInt(form.experience_min) || 0,
      p_education: form.education,
      p_contact_person: form.contact_person.trim(),
      p_contact_email: form.contact_email.trim(),
      p_contact_phone: form.contact_phone.trim(),
      p_vacancy_type: form.vacancy_type,
      p_subregion: form.subregion.trim(),
    });

    if (rpcError) {
      setError('Vakansiya yaradıla bilmədi: ' + rpcError.message);
      setLoading(false);
      return;
    }

    // Check whether the vacancy was published for free or needs payment
    const { data: vacancy } = await supabase
      .from('vacancies')
      .select('id, status')
      .eq('id', vacancyId)
      .single();

    if (vacancy?.status === 'active') {
      navigate('/employer/dashboard/vakansiyalar');
    } else {
      navigate(`/employer/dashboard/odenis/${vacancyId}`);
    }
  }

  if (!user?.company) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Şirkət profili tamamlanmayıb</h2>
        <p className="text-gray-500">Vakansiya yerləşdirmək üçün profilinizi tamamlayın.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yeni vakansiya</h1>
        <p className="text-sm text-gray-500 mt-1">Yeni iş elanı yerləşdirin</p>
      </div>

      {/* Quota info */}
      <div className={cn(
        'card p-4 flex items-center gap-3',
        canUseFree ? 'border-success-200 bg-success-50/50' : 'border-amber-200 bg-amber-50/50'
      )}>
        <Info className={cn('w-5 h-5 shrink-0', canUseFree ? 'text-success-600' : 'text-amber-600')} />
        <p className="text-sm text-gray-700">
          {canUseFree
            ? `Bu ay ${freeRemaining} pulsuz elan hüququnuz var. Standart elanı pulsuz yerləşdirə bilərsiniz.`
            : `Pulsuz kvota bitmişdir (${freeQuotaUsed}/${freeQuota}). Ödənişli elan yerləşdirə bilərsiniz.`}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vacancy type selector */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Elan tipi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('vacancy_type', 'standard')}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                form.vacancy_type === 'standard'
                  ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">Standart</span>
                {form.vacancy_type === 'standard' && <Check className="w-5 h-5 text-primary-600" />}
              </div>
              <p className="text-sm text-gray-500">
                {canUseFree
                  ? <span className="text-success-600 font-medium">Pulsuz (kvota)</span>
                  : <span className="font-semibold text-gray-900">{standardPrice.toFixed(0)} AZN</span>
                }
                <span className="text-gray-400"> / {durationDays} gün</span>
              </p>
            </button>

            <button
              type="button"
              onClick={() => update('vacancy_type', 'premium')}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                form.vacancy_type === 'premium'
                  ? 'border-accent-500 bg-accent-50/50 ring-1 ring-accent-200'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  <Star className="w-4 h-4 text-accent-500 fill-accent-500" /> Premium
                </span>
                {form.vacancy_type === 'premium' && <Check className="w-5 h-5 text-accent-600" />}
              </div>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{premiumPrice.toFixed(0)} AZN</span>
                <span className="text-gray-400"> / {durationDays} gün</span>
              </p>
              <p className="text-xs text-accent-600 mt-1">Premium bölmədə üst sırada</p>
            </button>
          </div>
        </div>

        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Ümumi məlumat</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vakansiya adı *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              className="input-field"
              placeholder="məs. Senior Frontend Developer"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kateqoriya *</label>
              <select value={form.category_id} onChange={e => update('category_id', e.target.value)} className="input-field" disabled={loading}>
                <option value="">Seçin</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_az}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şəhər *</label>
              <select value={form.city_id} onChange={e => update('city_id', e.target.value)} className="input-field" disabled={loading}>
                <option value="">Seçin</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name_az}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ərazi (kənd, qəsəbə və ya digər ərazi)</label>
            <input
              type="text"
              value={form.subregion}
              onChange={e => update('subregion', e.target.value)}
              className="input-field"
              placeholder="məs. Nehrəm kəndi, Qızılca kəndi, Ərəzin kəndi"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">Məcburi deyil.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İş tipi</label>
              <select value={form.employment_type} onChange={e => update('employment_type', e.target.value)} className="input-field" disabled={loading}>
                {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Təhsil səviyyəsi</label>
              <select value={form.education} onChange={e => update('education', e.target.value)} className="input-field" disabled={loading}>
                {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Salary */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Maaş</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum (AZN)</label>
              <input type="number" value={form.salary_min} onChange={e => update('salary_min', e.target.value)} className="input-field" placeholder="500" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maksimum (AZN)</label>
              <input type="number" value={form.salary_max} onChange={e => update('salary_max', e.target.value)} className="input-field" placeholder="1500" disabled={loading} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.salary_visible} onChange={e => update('salary_visible', e.target.checked)} className="text-primary-600 focus:ring-primary-500 rounded" disabled={loading} />
            Maaşı göstər
          </label>
        </div>

        {/* Description */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Ətraflı məlumat</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İş təsviri *</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={5} className="input-field resize-y" placeholder="İşin təsvirini daxil edin..." disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vəzifə öhdəlikləri</label>
            <textarea value={form.responsibilities} onChange={e => update('responsibilities', e.target.value)} rows={4} className="input-field resize-y" placeholder="Öhdəlikləri sadalayın..." disabled={loading} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tələblər</label>
            <textarea value={form.requirements} onChange={e => update('requirements', e.target.value)} rows={4} className="input-field resize-y" placeholder="Namizədə qoyulan tələblər..." disabled={loading} />
          </div>
        </div>

        {/* Contact */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Əlaqə məlumatları</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Əlaqə şəxsi</label>
              <input type="text" value={form.contact_person} onChange={e => update('contact_person', e.target.value)} className="input-field" placeholder="Ad Soyad" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Təcrübə (il)</label>
              <input type="number" value={form.experience_min} onChange={e => update('experience_min', e.target.value)} className="input-field" placeholder="0" disabled={loading} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} className="input-field" disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input type="tel" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className="input-field" disabled={loading} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {needsPayment
              ? <span>Ödəniş məbləği: <strong className="text-gray-900">{paymentAmount.toFixed(0)} AZN</strong></span>
              : <span className="text-success-600 font-medium">Pulsuz elan (kvota)</span>
            }
          </p>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Göndərilir...' : needsPayment ? 'Ödənişə keç' : 'Dərc et'}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Dərc olunmuş vakansiyanı birbaşa dəyişdirmək mümkün deyil. Düzəliş üçün adminə müraciət edə bilərsiniz.
        </p>
      </form>
    </div>
  );
}
