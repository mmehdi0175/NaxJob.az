import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle2, XCircle, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Company } from '@/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 15;

interface CompanyWithCount extends Company {
  vacancy_count?: number;
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<CompanyWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('companies').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,voen.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }
    const from = (page - 1) * PAGE_SIZE;
    query = query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    const { data, count } = await query;
    const comps = (data as Company[]) || [];

    // Get vacancy counts
    if (comps.length > 0) {
      const compIds = comps.map(c => c.id);
      const { data: countData } = await supabase
        .from('vacancies')
        .select('company_id')
        .in('company_id', compIds)
        .eq('status', 'active');
      const counts: Record<string, number> = {};
      (countData || []).forEach((r: { company_id: string }) => {
        counts[r.company_id] = (counts[r.company_id] || 0) + 1;
      });
      comps.forEach(c => { (c as CompanyWithCount).vacancy_count = counts[c.id] || 0; });
    }

    setCompanies(comps);
    setTotal(count || 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { setPage(1); }, [search]);

  async function toggleVerify(companyId: string, current: boolean) {
    setActionLoading(companyId);
    await supabase.from('companies').update({ is_verified: !current }).eq('id', companyId);
    await supabase.from('admin_actions').insert({
      admin_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: current ? 'unverify_employer' : 'verify_employer',
      target_type: 'company',
      target_id: companyId,
    });
    setActionLoading(null);
    fetchCompanies();
  }

  async function toggleActive(companyId: string, current: boolean) {
    setActionLoading(companyId);
    await supabase.from('companies').update({ is_active: !current }).eq('id', companyId);
    await supabase.from('admin_actions').insert({
      admin_id: (await supabase.auth.getUser()).data.user?.id,
      action_type: current ? 'deactivate_employer' : 'activate_employer',
      target_type: 'company',
      target_id: companyId,
    });
    setActionLoading(null);
    fetchCompanies();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Şirkətlər</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Şirkət adı, VÖEN və ya email ilə axtar..."
          className="input-field pl-10"
        />
      </div>

      <p className="text-sm text-gray-500">{total} şirkət</p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      ) : companies.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">Şirkət tapılmadı.</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Şirkət</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">VÖEN</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Telefon</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Vakansiya</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Əməliyyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/sirket/${c.id}`} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {c.company_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-primary-700 truncate">{c.company_name}</p>
                          <p className="text-xs text-gray-500 truncate">{c.contact_email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{c.voen}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{c.contact_phone}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="badge bg-primary-50 text-primary-700">{c.vacancy_count || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.is_verified ? (
                          <span className="badge bg-success-100 text-success-700"><CheckCircle2 className="w-3 h-3" /> Təsdiqli</span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">Təsdiqlənməmiş</span>
                        )}
                        {!c.is_active && <span className="badge bg-red-100 text-red-700">Deaktiv</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleVerify(c.id, c.is_verified)}
                          disabled={actionLoading === c.id}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-50',
                            c.is_verified ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-success-600 text-white hover:bg-success-700'
                          )}
                        >
                          {c.is_verified ? 'Təsdiqi sil' : 'Təsdiqlə'}
                        </button>
                        <button
                          onClick={() => toggleActive(c.id, c.is_active)}
                          disabled={actionLoading === c.id}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-50',
                            c.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          )}
                        >
                          {c.is_active ? 'Deaktiv et' : 'Aktivləşdir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
