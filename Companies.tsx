import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { supabase } from '@/lib/supabase';
import type { Company } from '@/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

export default function Companies() {
  const [companies, setCompanies] = useState<(Company & { vacancy_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from('companies')
        .select('*, vacancies!inner(id)', { count: 'exact' })
        .eq('is_active', true)
        .eq('vacancies.status', 'active')
        .range(from, to)
        .order('created_at', { ascending: false });

      const mapped = (data || []).map((c: Record<string, unknown>) => ({
        ...(c as unknown as Company),
        vacancy_count: Array.isArray(c.vacancies) ? c.vacancies.length : 0,
      }));
      setCompanies(mapped);
      setTotal(count || 0);
      setLoading(false);
    }
    load();
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Şirkətlər</h1>
          <p className="text-gray-500 mt-1">Aktiv vakansiya yerləşdirən şirkətlər</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Spinner size={32} className="py-16" />
        ) : companies.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  to={`/sirket/${c.id}`}
                  className="card p-5 hover:shadow-md hover:border-primary-300 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-lg font-bold shrink-0">
                      {c.company_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors truncate">
                          {c.company_name}
                        </h3>
                        {c.is_verified && (
                          <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                        )}
                      </div>
                      {c.address && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">{c.address}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-primary-600">
                        <Briefcase className="w-4 h-4" />
                        <span className="font-medium">{c.vacancy_count} aktiv vakansiya</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = startPage + i;
                  if (p > totalPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                        page === p ? 'bg-primary-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="card p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Heç bir şirkət tapılmadı.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
