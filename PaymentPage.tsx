import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Vacancy, AdminSettings, Payment } from '@/types';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PaymentPage() {
  const { vacancyId } = useParams();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!vacancyId) return;
    async function load() {
      const [vacRes, setRes] = await Promise.all([
        supabase.from('vacancies').select('*, category:categories(*), city:cities(*)').eq('id', vacancyId!).maybeSingle(),
        supabase.from('admin_settings').select('*').limit(1).maybeSingle(),
      ]);
      if (!vacRes.data) {
        setError('Vakansiya tapılmadı.');
        setLoading(false);
        return;
      }
      const vac = vacRes.data as unknown as Vacancy;
      setVacancy(vac);
      if (setRes.data) setSettings(setRes.data as AdminSettings);

      if (vac.payment_id) {
        const { data: payData } = await supabase.from('payments').select('*').eq('id', vac.payment_id).maybeSingle();
        if (payData) setExistingPayment(payData as Payment);
      }
      setLoading(false);
    }
    load();
  }, [vacancyId]);

  async function handlePayment() {
    if (!vacancy || !settings) return;
    setProcessing(true);
    setError('');

    const amount = vacancy.vacancy_type === 'premium' ? settings.premium_vacancy_price : settings.standard_vacancy_price;
    const idempotencyKey = `vac-${vacancy.id}-${Date.now()}`;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            vacancy_id: vacancy.id,
            company_id: vacancy.company_id,
            vacancy_type: vacancy.vacancy_type,
            amount,
            idempotency_key: idempotencyKey,
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Ödəniş uğursuz (${response.status})`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/employer/dashboard/vakansiyalar'), 2500);
      } else {
        throw new Error(result.error || 'Ödəniş təsdiqlənmədi.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödəniş zamanı xəta baş verdi.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success-100 text-success-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ödəniş təsdiqləndi!</h2>
          <p className="text-gray-500 mb-4">Vakansiyanız uğurla dərc olundu.</p>
          <Loader2 className="w-5 h-5 text-primary-600 animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-2">Yönləndirilir...</p>
        </div>
      </div>
    );
  }

  if (!vacancy) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">Vakansiya tapılmadı.</p>
        <Link to="/employer/dashboard/vakansiyalar" className="btn-primary mt-4">Vakansiyalara qayıt</Link>
      </div>
    );
  }

  const amount = vacancy.vacancy_type === 'premium'
    ? (settings?.premium_vacancy_price ?? 20)
    : (settings?.standard_vacancy_price ?? 15);
  const isTestMode = settings?.payment_test_mode ?? true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-700">
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>

      <h1 className="text-2xl font-bold text-gray-900">Ödəniş</h1>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Vacancy summary */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Vakansiya məlumatı</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Vakansiya</dt>
            <dd className="font-medium text-gray-900">{vacancy.title}</dd>
          </div>
          {vacancy.city && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Şəhər</dt>
              <dd className="font-medium text-gray-900">{vacancy.city.name_az}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-gray-500">Elan tipi</dt>
            <dd className="font-medium text-gray-900 capitalize">
              {vacancy.vacancy_type === 'premium' ? 'Premium' : 'Standart'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Müddət</dt>
            <dd className="font-medium text-gray-900">{settings?.vacancy_duration_days ?? 30} gün</dd>
          </div>
        </dl>
      </div>

      {/* Payment amount */}
      <div className="card p-5 bg-gradient-to-br from-primary-50/50 to-white">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Ödəniş məbləği</span>
          <span className="text-3xl font-bold text-primary-700">{formatPrice(amount)}</span>
        </div>

        {isTestMode && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Test rejimi</p>
              <p>Ödəniş sistemi test rejimindədir. Real ödəniş həyata keçirilmir. Real ödəniş providerinin açarları konfiqurasiya edildikdən sonra aktivləşdiriləcək.</p>
            </div>
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={processing || !!existingPayment}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {processing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Emal olunur...</>
          ) : existingPayment ? (
            <><CheckCircle2 className="w-5 h-5" /> Ödəniş artıq mövcuddur</>
          ) : (
            <><CreditCard className="w-5 h-5" /> {formatPrice(amount)} ödə</>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4" />
          Ödəniş təhlükəsiz şəkildə emal olunur. Kart məlumatları saxlanılmır.
        </div>
      </div>

      {existingPayment && (
        <div className="card p-4 flex items-center gap-3 bg-success-50/50 border-success-200">
          <CheckCircle2 className="w-5 h-5 text-success-600" />
          <p className="text-sm text-gray-700">
            Bu vakansiya üçün ödəniş artıq {existingPayment.status === 'confirmed' ? 'təsdiqlənib' : 'gözləyir'}.
            Status: <strong>{existingPayment.status}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
