import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Payment, Vacancy } from '@/types';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { formatPrice, cn } from '@/lib/utils';

interface PaymentWithVacancy extends Payment {
  vacancy?: Pick<Vacancy, 'title' | 'vacancy_type'>;
}

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithVacancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company?.id) { setLoading(false); return; }
    async function load() {
      if (!user?.company?.id) return;
      const { data } = await supabase
        .from('payments')
        .select('*, vacancy:vacancies(title, vacancy_type)')
        .eq('company_id', user.company!.id)
        .order('created_at', { ascending: false });
      setPayments((data as unknown as PaymentWithVacancy[]) || []);
      setLoading(false);
    }
    load();
  }, [user?.company?.id]);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ödənişlər</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <CreditCard className="w-8 h-8 text-primary-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{payments.length}</div>
          <div className="text-sm text-gray-500">Ümumi əməliyyat</div>
        </div>
        <div className="card p-5">
          <CheckCircle2 className="w-8 h-8 text-success-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{formatPrice(totalPaid)}</div>
          <div className="text-sm text-gray-500">Ümumi ödənilmiş</div>
        </div>
        <div className="card p-5">
          <Clock className="w-8 h-8 text-amber-600 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{payments.filter(p => p.status === 'pending').length}</div>
          <div className="text-sm text-gray-500">Gözləyən</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Hələ ödəniş əməliyyatı yoxdur.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vakansiya</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Məbləğ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tarix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]">
                    {p.vacancy?.title || 'Silinmiş vakansiya'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn('badge', p.vacancy_type === 'premium' ? 'bg-accent-100 text-accent-700' : 'bg-primary-50 text-primary-700')}>
                      {p.vacancy_type === 'premium' ? 'Premium' : 'Standart'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', PAYMENT_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600')}>
                      {PAYMENT_STATUS_LABELS[p.status] || p.status}
                    </span>
                    {p.test_mode && <span className="ml-1 text-xs text-amber-600">test</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDateTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
