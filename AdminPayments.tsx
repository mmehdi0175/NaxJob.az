import { useEffect, useState, useCallback } from 'react';
import { CreditCard, DollarSign, TrendingUp, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Payment } from '@/types';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { formatPrice, cn } from '@/lib/utils';

interface PaymentWithVacancy extends Payment {
  vacancy?: { title: string };
  company?: { company_name: string };
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'failed' | 'cancelled' | 'refunded';

const PAGE_SIZE = 20;

export default function AdminPayments() {
  const [payments, setPayments] = useState<PaymentWithVacancy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stats, setStats] = useState({ totalRevenue: 0, confirmedCount: 0, pendingCount: 0, testModeCount: 0 });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('payments')
      .select('*, vacancy:vacancies(title), company:companies(company_name)', { count: 'exact' });
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    const from = (page - 1) * PAGE_SIZE;
    query = query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    const { data, count } = await query;
    setPayments((data as unknown as PaymentWithVacancy[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  useEffect(() => {
    async function loadStats() {
      const [confirmedRes, pendingRes, testRes] = await Promise.all([
        supabase.from('payments').select('amount').eq('status', 'confirmed'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('test_mode', true),
      ]);
      const totalRev = (confirmedRes.data || []).reduce((sum, p) => sum + (p as { amount: number }).amount, 0);
      setStats({
        totalRevenue: totalRev,
        confirmedCount: (confirmedRes.data || []).length,
        pendingCount: pendingRes.count || 0,
        testModeCount: testRes.count || 0,
      });
    }
    loadStats();
  }, [fetchPayments]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Hamısı' },
    { value: 'confirmed', label: 'Təsdiqlənmiş' },
    { value: 'pending', label: 'Gözləyən' },
    { value: 'failed', label: 'Uğursuz' },
    { value: 'cancelled', label: 'Ləğv edilmiş' },
    { value: 'refunded', label: 'Geri qaytarılmış' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ödənişlər və Gəlir</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <DollarSign className="w-8 h-8 text-success-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</div>
          <div className="text-sm text-gray-500">Ümumi gəlir</div>
        </div>
        <div className="card p-5">
          <CreditCard className="w-8 h-8 text-primary-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.confirmedCount}</div>
          <div className="text-sm text-gray-500">Təsdiqlənmiş ödəniş</div>
        </div>
        <div className="card p-5">
          <TrendingUp className="w-8 h-8 text-amber-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
          <div className="text-sm text-gray-500">Gözləyən</div>
        </div>
        <div className="card p-5">
          <CreditCard className="w-8 h-8 text-gray-400 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.testModeCount}</div>
          <div className="text-sm text-gray-500">Test rejimi</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              statusFilter === f.value ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">Ödəniş tapılmadı.</div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vakansiya</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Şirkət</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Məbləğ</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Rejim</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Tarix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[180px]">
                      {p.vacancy?.title || 'Silinmiş'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.company?.company_name || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', PAYMENT_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600')}>
                        {PAYMENT_STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.test_mode ? <span className="badge bg-amber-100 text-amber-700">Test</span> : <span className="badge bg-primary-50 text-primary-700">Real</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                ←
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
