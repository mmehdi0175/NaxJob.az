import { useEffect, useState, FormEvent } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { validatePhone } from '@/lib/utils';

export default function CompanyProfileSettings() {
  const { user, refreshCompany } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    voen: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    website_url: '',
    address: '',
  });

  useEffect(() => {
    if (user?.company) {
      setForm({
        company_name: user.company.company_name || '',
        voen: user.company.voen || '',
        contact_email: user.company.contact_email || '',
        contact_phone: user.company.contact_phone || '',
        description: user.company.description || '',
        website_url: user.company.website_url || '',
        address: user.company.address || '',
      });
    }
  }, [user?.company]);

  function update(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!form.company_name.trim()) { setError('Şirkət adı tələb olunur.'); return; }
    if (!validatePhone(form.contact_phone)) { setError('Düzgün telefon nömrəsi daxil edin.'); return; }
    if (!user?.company?.id) return;

    setLoading(true);
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        company_name: form.company_name.trim(),
        contact_phone: form.contact_phone.trim(),
        description: form.description.trim() || null,
        website_url: form.website_url.trim() || null,
        address: form.address.trim() || null,
      })
      .eq('id', user.company.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      await refreshCompany();
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  }

  if (!user?.company) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="text-gray-500">Şirkət profili tapılmadı.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Şirkət profili</h1>
        <p className="text-sm text-gray-500 mt-1">Şirkət məlumatlarınızı yeniləyin</p>
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
          <span>Profil uğurla yeniləndi!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Şirkət adı *</label>
          <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)} className="input-field" disabled={loading} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">VÖEN</label>
          <input type="text" value={form.voen} className="input-field bg-gray-50" disabled readOnly />
          <p className="text-xs text-gray-400 mt-1">VÖEN dəyişdirilə bilməz. Yalnız admin dəyişə bilər.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.contact_email} className="input-field bg-gray-50" disabled readOnly />
          <p className="text-xs text-gray-400 mt-1">Email dəyişdirilə bilməz.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
          <input type="tel" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} className="input-field" disabled={loading} placeholder="+994 50 123 45 67" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Veb sayt</label>
          <input type="url" value={form.website_url} onChange={e => update('website_url', e.target.value)} className="input-field" disabled={loading} placeholder="https://www.sirket.az" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ünvan</label>
          <input type="text" value={form.address} onChange={e => update('address', e.target.value)} className="input-field" disabled={loading} placeholder="Bakı, Azərbaycan" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Haqqında</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4} className="input-field resize-y" disabled={loading} placeholder="Şirkət haqqında məlumat..." />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="w-5 h-5" /> {loading ? 'Saxlanılır...' : 'Saxla'}
          </button>
        </div>
      </form>

      <div className="card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Təsdiqlənmə statusu</p>
          <p className="text-sm text-gray-500">
            {user.company.is_verified
              ? <span className="text-success-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Təsdiqlənmiş şirkət</span>
              : 'Şirkət hələ təsdiqlənməyib. Admin tərəfindən yoxlanılır.'}
          </p>
        </div>
      </div>
    </div>
  );
}
