import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, MapPin, Globe, Mail, Phone, CheckCircle2, ArrowLeft, Briefcase, Calendar } from 'lucide-react';
import Layout from '@/components/Layout';
import VacancyCard from '@/components/VacancyCard';
import { Spinner } from '@/components/Spinner';
import { supabase } from '@/lib/supabase';
import type { Company, Vacancy } from '@/types';
import { formatDate } from '@/lib/format';

export default function CompanyProfile() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [compRes, vacRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('vacancies')
          .select('*, company:companies(*), category:categories(*), city:cities(*)')
          .eq('company_id', id)
          .eq('status', 'active')
          .order('vacancy_type', { ascending: false })
          .order('published_at', { ascending: false }),
      ]);
      if (!compRes.data) {
        setNotFound(true);
      } else {
        setCompany(compRes.data as Company);
        setVacancies((vacRes.data as unknown as Vacancy[]) || []);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return <Layout><Spinner size={40} className="min-h-[60vh]" /></Layout>;
  }

  if (notFound || !company) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Şirkət tapılmadı</h1>
          <Link to="/sirketler" className="btn-primary mt-4">Şirkətlərə qayıt</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/sirketler" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-700 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Şirkətlər
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-2xl sm:text-3xl font-bold shrink-0">
              {company.company_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{company.company_name}</h1>
                {company.is_verified && (
                  <span className="badge bg-success-100 text-success-700">
                    <CheckCircle2 className="w-3 h-3" /> Təsdiqlənmiş
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {company.address && (
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {company.address}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> {formatDate(company.created_at)} tarixində qoşulub
                </span>
              </div>
            </div>
          </div>

          {company.description && (
            <p className="mt-4 text-gray-700 leading-relaxed">{company.description}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {company.website_url && (
              <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700">
                <Globe className="w-4 h-4" /> Veb sayt
              </a>
            )}
            <span className="flex items-center gap-1.5 text-gray-600">
              <Mail className="w-4 h-4" /> {company.contact_email}
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <Phone className="w-4 h-4" /> {company.contact_phone}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-600" /> Aktiv vakansiyalar
          </h2>
          <span className="text-sm text-gray-500">{vacancies.length} vakansiya</span>
        </div>

        {vacancies.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {vacancies.map((v) => (
              <VacancyCard key={v.id} vacancy={v} />
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Bu şirkətin hal-hazırda aktiv vakansiyası yoxdur.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
