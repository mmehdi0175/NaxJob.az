import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validateVoen, validatePhone } from '@/lib/utils';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    voen: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

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
      .eq('contact_email', form.email.trim())
      .maybeSingle();

    if (existing) {
      setError('Bu email artıq qeydiyyatdan keçib.');
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          user_role: 'employer',
          company_name: form.companyName.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: companyError } = await supabase.from('companies').insert({
        user_id: data.user.id,
        company_name: form.companyName.trim(),
        voen: form.voen.trim(),
        contact_email: form.email.trim(),
        contact_phone: form.phone.trim(),
      });

      if (companyError) {
        setError('Şirkət profili yaradıla bilmədi: ' + companyError.message);
        setLoading(false);
        return;
      }

      setSuccess('Qeydiyyat uğurla tamamlandı! İdarəetmə panelinə yönləndirilirsiniz...');
      setTimeout(() => navigate('/employer/dashboard'), 1500);
    }

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
          <h1 className="text-xl font-bold text-gray-900 mb-1">İşəgötürən qeydiyyatı</h1>
          <p className="text-sm text-gray-500 mb-6">Şirkətinizi qeydiyyatdan keçirin və elan yerləşdirin</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-slide-down">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-success-50 border border-success-200 p-3 text-sm text-success-700 animate-slide-down">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şirkət adı *</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => update('companyName', e.target.value)}
                className="input-field"
                placeholder="Məs. Azərbaycan Texnologiyalar MMC"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VÖEN (Vergi identifikasiya nömrəsi) *</label>
              <input
                type="text"
                value={form.voen}
                onChange={(e) => update('voen', e.target.value)}
                className="input-field"
                placeholder="10 rəqəmli VÖEN"
                maxLength={10}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="input-field"
                placeholder="name@company.az"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon nömrəsi *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="input-field"
                placeholder="+994 50 123 45 67"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifrə *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="input-field"
                  placeholder="••••••"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Təkrar şifrə *</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  className="input-field"
                  placeholder="••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Qeydiyyat...' : 'Qeydiyyatdan keç'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            Hesabınız var? <Link to="/giris" className="text-primary-600 hover:text-primary-700 font-medium">Daxil olun</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
