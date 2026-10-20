import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, AlertCircle, CheckCircle2, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validateVoen, validatePhone } from '@/lib/utils';

type Step = 'form' | 'verify' | 'done';

export default function EmployerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devCode, setDevCode] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    voen: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [verifyCode, setVerifyCode] = useState('');

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.companyName.trim()) return setError('Şirkət adı tələb olunur.');
    if (!validateVoen(form.voen)) return setError('VÖEN 10 rəqəmli olmalıdır.');
    if (!form.email.trim()) return setError('Email tələb olunur.');
    if (!validatePhone(form.phone)) return setError('Düzgün telefon nömrəsi daxil edin (məs. +994 50 123 45 67).');
    if (form.password.length < 6) return setError('Şifrə ən azı 6 simvol olmalıdır.');
    if (form.password !== form.confirmPassword) return setError('Şifrələr uyğun gəlmir.');

    setLoading(true);

    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('contact_email', form.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      setError('Bu email artıq qeydiyyatdan keçib.');
      setLoading(false);
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'send-code',
        email: form.email.trim().toLowerCase(),
        purpose: 'employer',
        payload: {
          company_name: form.companyName.trim(),
          voen: form.voen.trim(),
          phone: form.phone.trim(),
          password: form.password,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error || 'Təsdiq kodu göndərilə bilmədi.');
      setLoading(false);
      return;
    }

    if (result.dev_code) {
      setDevCode(result.dev_code);
    }

    setSuccess('Təsdiq kodu e-poçtunuza göndərildi.');
    setStep('verify');
    setLoading(false);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verifyCode.trim()) return setError('Təsdiq kodunu daxil edin.');

    setLoading(true);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'verify-and-register',
        email: form.email.trim().toLowerCase(),
        code: verifyCode.trim(),
        purpose: 'employer',
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error || 'Qeydiyyat tamamlana bilmədi.');
      setLoading(false);
      return;
    }

    setSuccess('Qeydiyyat uğurla tamamlandı!');
    setStep('done');
    setLoading(false);

    setTimeout(async () => {
      await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate('/employer/dashboard');
    }, 1500);
  }

  async function handleResend() {
    setError('');
    setLoading(true);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'send-code',
        email: form.email.trim().toLowerCase(),
        purpose: 'employer',
        payload: {
          company_name: form.companyName.trim(),
          voen: form.voen.trim(),
          phone: form.phone.trim(),
          password: form.password,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      setError(result.error || 'Kod yenidən göndərilə bilmədi.');
      setLoading(false);
      return;
    }

    if (result.dev_code) {
      setDevCode(result.dev_code);
    }

    setSuccess('Yeni təsdiq kodu göndərildi.');
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-700">İşBaza</span>
        </Link>

        <div className="card p-6 sm:p-8">
          {step === 'form' && (
            <>
              <Link to="/qeydiyyat" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Geri
              </Link>
              <h1 className="text-xl font-bold text-gray-900 mb-1">İşəgötürən qeydiyyatı</h1>
              <p className="text-sm text-gray-500 mb-6">Şirkətinizi qeydiyyatdan keçirin və elan yerləşdirin</p>

              {error && <ErrorBox message={error} />}
              {success && <SuccessBox message={success} />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Şirkət adı *" value={form.companyName} onChange={(v) => update('companyName', v)} placeholder="Məs. Azərbaycan Texnologiyalar MMC" disabled={loading} />
                <FormField label="VÖEN *" value={form.voen} onChange={(v) => update('voen', v)} placeholder="10 rəqəmli VÖEN" maxLength={10} disabled={loading} />
                <FormField label="Email *" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="name@company.az" disabled={loading} />
                <FormField label="Telefon nömrəsi *" type="tel" value={form.phone} onChange={(v) => update('phone', v)} placeholder="+994 50 123 45 67" disabled={loading} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Şifrə *" type="password" value={form.password} onChange={(v) => update('password', v)} placeholder="••••••" disabled={loading} />
                  <FormField label="Təkrar şifrə *" type="password" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="••••••" disabled={loading} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Göndərilir...' : 'Davam et'}
                </button>
              </form>
            </>
          )}

          {step === 'verify' && (
            <>
              <Link to="/qeydiyyat" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Geri
              </Link>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">E-poçt təsdiqi</h1>
                <p className="text-sm text-gray-500">
                  <strong className="text-gray-700">{form.email}</strong> ünvanına göndərilmiş 6 rəqəmli təsdiq kodunu daxil edin.
                </p>
              </div>

              {devCode && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 text-center">
                  Test rejimi — kod: <strong className="text-lg tracking-widest">{devCode}</strong>
                </div>
              )}

              {error && <ErrorBox message={error} />}
              {success && <SuccessBox message={success} />}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Təsdiq kodu *</label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="input-field text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    disabled={loading}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  {loading ? 'Yoxlanılır...' : 'Təsdiqlə'}
                </button>
                <button type="button" onClick={handleResend} disabled={loading} className="w-full text-sm text-gray-500 hover:text-primary-700 transition-colors">
                  Kodu yenidən göndər
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success-50 text-success-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Qeydiyyat tamamlandı!</h1>
              <p className="text-sm text-gray-500">İdarəetmə panelinə yönləndirilirsiniz...</p>
            </div>
          )}

          {step !== 'done' && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Hesabınız var? <Link to="/giris" className="text-primary-600 hover:text-primary-700 font-medium">Daxil olun</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-slide-down">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-success-50 border border-success-200 p-3 text-sm text-success-700 animate-slide-down">
      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
}

function FormField({ label, value, onChange, placeholder, type = 'text', maxLength, disabled }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
      />
    </div>
  );
}
