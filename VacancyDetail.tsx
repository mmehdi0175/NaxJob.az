import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Briefcase, Clock, Star, Building2, Mail, Phone, User,
  Calendar, Wallet, GraduationCap, ArrowLeft, Share2, CheckCircle2,
  Send, Copy, Check, X, FileText,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { supabase } from '@/lib/supabase';
import type { Vacancy } from '@/types';
import { formatSalary, formatDate, daysUntilExpiry } from '@/lib/format';
import { EMPLOYMENT_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function VacancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('vacancies')
        .select('*, company:companies(*), category:categories(*), city:cities(*)')
        .eq('id', id)
        .maybeSingle();

      if (!data) {
        setNotFound(true);
      } else {
        setVacancy(data as unknown as Vacancy);
        await supabase.rpc('expire_old_vacancies');
        if (data.status === 'active') {
          await supabase.from('vacancies').update({ views_count: (data.views_count || 0) + 1 }).eq('id', id);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <Spinner size={40} className="min-h-[60vh]" />
      </Layout>
    );
  }

  if (notFound || !vacancy) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vakansiya tapılmadı</h1>
          <p className="text-gray-500 mb-6">Bu vakansiya artıq mövcud deyil və ya silinmiş ola bilər.</p>
          <Link to="/vakansiyalar" className="btn-primary">Vakansiyalara qayıt</Link>
        </div>
      </Layout>
    );
  }

  const isPremium = vacancy.vacancy_type === 'premium';
  const daysLeft = daysUntilExpiry(vacancy.expires_at);
  const applyEmail = vacancy.contact_email || vacancy.company?.contact_email || '';
  const isExpired = vacancy.status === 'expired' || (daysLeft !== null && daysLeft < 0);

  function copyEmail() {
    if (!applyEmail) return;
    navigator.clipboard.writeText(applyEmail).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.createElement('input');
      input.value = applyEmail;
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
      document.body.removeChild(input);
    });
  }

  const mailtoLink = applyEmail
    ? `mailto:${applyEmail}?subject=${encodeURIComponent('Müraciət: ' + vacancy.title)}`
    : '';

  return (
    <Layout>
      <div className="bg-gradient-to-br from-gray-50 to-primary-50/30 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Geri
          </button>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {isPremium && (
              <span className="badge bg-accent-100 text-accent-700">
                <Star className="w-3 h-3 fill-accent-500" /> Premium
              </span>
            )}
            <span className="badge bg-primary-50 text-primary-700">{vacancy.employment_type}</span>
            {vacancy.category && (
              <span className="badge bg-gray-100 text-gray-600">{vacancy.category.name_az}</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{vacancy.title}</h1>

          <div className="flex items-center gap-3 mb-4">
            <Link to={`/sirket/${vacancy.company_id}`} className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                {vacancy.company?.company_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                  {vacancy.company?.company_name}
                </p>
                {vacancy.company?.is_verified && (
                  <p className="text-xs text-success-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Təsdiqlənmiş şirkət
                  </p>
                )}
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
            {vacancy.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {vacancy.city.name_az}{vacancy.subregion ? `, ${vacancy.subregion}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-gray-400" />
              {formatSalary(vacancy.salary_min, vacancy.salary_max, vacancy.salary_visible, vacancy.salary_currency)}
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-gray-400" /> {vacancy.employment_type}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              Dərc edilib: {formatDate(vacancy.published_at)}
            </span>
            {daysLeft !== null && daysLeft >= 0 && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <Clock className="w-4 h-4" /> {daysLeft} gün qalıb
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {vacancy.description && (
              <section className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">İş təsviri</h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {vacancy.description}
                </div>
              </section>
            )}

            {vacancy.responsibilities && (
              <section className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Vəzifə öhdəlikləri</h2>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {vacancy.responsibilities}
                </div>
              </section>
            )}

            {vacancy.requirements && (
              <section className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Tələblər</h2>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {vacancy.requirements}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {/* Apply button */}
            <button
              onClick={() => setShowApplyModal(true)}
              disabled={isExpired}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all',
                isExpired
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
              )}
            >
              <Send className="w-4 h-4" />
              {isExpired ? 'Müraciət bağlıdır' : 'Müraciət et'}
            </button>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Əlaqə məlumatları</h3>
              <div className="space-y-3 text-sm">
                {vacancy.contact_person && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" /> {vacancy.contact_person}
                  </div>
                )}
                {vacancy.contact_email && (
                  <a href={`mailto:${vacancy.contact_email}`} className="flex items-center gap-2 text-gray-700 hover:text-primary-700 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400" /> {vacancy.contact_email}
                  </a>
                )}
                {vacancy.contact_phone && (
                  <a href={`tel:${vacancy.contact_phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-gray-700 hover:text-primary-700 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400" /> {vacancy.contact_phone}
                  </a>
                )}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Əlavə məlumat</h3>
              <dl className="space-y-3 text-sm">
                {vacancy.experience_min !== null && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Təcrübə</dt>
                    <dd className="font-medium text-gray-900">{vacancy.experience_min}+ il</dd>
                  </div>
                )}
                {vacancy.education && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Təhsil</dt>
                    <dd className="font-medium text-gray-900">{vacancy.education}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">İş tipi</dt>
                  <dd className="font-medium text-gray-900">{vacancy.employment_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Müddət</dt>
                  <dd className="font-medium text-gray-900">30 gün</dd>
                </div>
              </dl>
            </div>

            {vacancy.company && (
              <Link to={`/sirket/${vacancy.company_id}`} className="card p-5 block hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-bold">
                    {vacancy.company.company_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{vacancy.company.company_name}</p>
                    {vacancy.company.is_verified && (
                      <p className="text-xs text-success-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Təsdiqlənmiş
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-primary-600 font-medium">Şirkət profilinə bax →</p>
              </Link>
            )}
          </aside>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowApplyModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-600" />
                CV ilə müraciət
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyEmail ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  CV faylınızı aşağıdaki e-poçt ünvanına göndərin:
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">E-poçt ünvanı:</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={mailtoLink}
                      className="text-primary-700 font-medium hover:underline break-all flex-1 min-w-0"
                      onDoubleClick={copyEmail}
                    >
                      {applyEmail}
                    </a>
                    <button
                      onClick={copyEmail}
                      className="shrink-0 p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                      title="Kopyala"
                    >
                      {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {copied && (
                  <div className="flex items-center gap-2 text-sm text-success-600 bg-success-50 border border-success-200 rounded-lg p-2.5">
                    <Check className="w-4 h-4" /> E-poçt ünvanı kopyalandı
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={mailtoLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" /> E-poçt aç
                  </a>
                  <button
                    onClick={copyEmail}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-success-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>CV faylınızı e-poçta özünüz əlavə edin. Mövzu sətrində vakansiyanın adı avtomatik göstərilir.</span>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  E-poçt ünvanına iki dəfə klik edərək də kopyalaya bilərsiniz.
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-600 text-sm">
                  CV göndərmək üçün e-poçt ünvanı qeyd edilməyib.
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Bu vakansiya üçün e-poçt ilə müraciət mümkün deyil.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
