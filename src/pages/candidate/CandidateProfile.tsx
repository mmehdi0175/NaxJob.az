import { useEffect, useState, FormEvent } from 'react';
import { AlertCircle, CheckCircle2, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { validatePhone } from '@/lib/utils';
import type { Candidate } from '@/types';

export default function CandidateProfile() {
  const { user, refreshCandidate } = useAuth();
  const [existing, setExisting] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    phone: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mounted) return;
      const c = data as unknown as Candidate | null;
      setExisting(c);
      if (c) {
        setForm({
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          patronymic: c.patronymic || '',
          phone: c.phone || '',
        });
      } else if (user.candidate) {
        setForm({
          first_name: user.candidate.first_name || '',
          last_name: user.candidate.last_name || '',
          patronymic: user.candidate.patronymic || '',
          phone: user.candidate.phone || '',
        });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!user) return;

    if (!form.first_name.trim()) return setError('Ad tələb olunur.');
    if (!form.last_name.trim()) return setError('Soyad tələb olunur.');
    if (!form.patronymic.trim()) return setError('Ata adı tələb olunur.');
    if (!validatePhone(form.phone)) return setError('Düzgün telefon nömrəsi daxil edin.');

    setSaving(true);
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      patronymic: form.patronymic.trim(),
      phone: form.phone.trim(),
    };

    if (existing) {
      const { error: updErr } = await supabase
        .from('candidates')
        .update(payload)
        .eq('user_id', user.id);
      if (updErr) {
        setError('Profil yenilənmədi: ' + updErr.message);
        setSaving(false);
        return;
      }
    } else {
      if (!user.candidate) {
        setError('Profil məlumatları tapılmadı.');
        setSaving(false);
        return;
      }
      const { error: insErr } = await supabase
        .from('candidates')
        .insert({
          user_id: user.id,
          email: user.candidate.email,
          ...payload,
        });
      if (insErr) {
        setError('Profil yaradıla bilmədi: ' + insErr.message);
        setSaving(false);
        return;
      }
    }

    await refreshCandidate();
    setSuccess('Profil uğurla yeniləndi.');
    setSaving(false);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
          <UserCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profilim</h1>
          <p className="text-sm text-gray-500">Şəxsi məlumatlarınızı redaktə edin.</p>
        </div>
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
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              className="input-field"
              placeholder="Ad"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Soyad *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              className="input-field"
              placeholder="Soyad"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ata adı *</label>
            <input
              type="text"
              value={form.patronymic}
              onChange={(e) => update('patronymic', e.target.value)}
              className="input-field"
              placeholder="Ata adı"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-poçt</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="input-field bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">E-poçt dəyişdirilə bilməz.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Əlaqə nömrəsi *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="input-field"
            placeholder="+994 50 123 45 67"
          />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saxlanılır...' : 'Profili yenilə'}
          </button>
        </div>
      </form>
    </div>
  );
}
