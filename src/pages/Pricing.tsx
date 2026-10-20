import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Star, Zap, Shield, Clock, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import type { AdminSettings } from '@/types';

export default function Pricing() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);

  useEffect(() => {
    supabase.from('admin_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as AdminSettings);
    });
  }, []);

  const standardPrice = settings?.standard_vacancy_price ?? 15;
  const premiumPrice = settings?.premium_vacancy_price ?? 20;
  const freeQuota = settings?.free_quota_per_month ?? 2;
  const duration = settings?.vacancy_duration_days ?? 30;

  const features = [
    { icon: Shield, title: '2 pulsuz elan', desc: `Hər ay ${freeQuota} vakansiya tam pulsuzdur` },
    { icon: Clock, title: `${duration} gün aktiv`, desc: 'Hər elan 30 gün ərzində aktiv qalır' },
    { icon: TrendingUp, title: 'Geniş auditoriya', desc: 'Minlərlə namizədə çatın' },
    { icon: Zap, title: 'Tez dərc', desc: 'Ödəniş təsdiqlənən kimi dərc olunur' },
  ];

  return (
    <Layout>
      <div className="bg-gradient-to-br from-primary-700 to-primary-800 py-16 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold mb-3 text-balance">Qiymətlər və paketlər</h1>
          <p className="text-primary-100 text-lg">İş elanlarınızı effektiv şəkildə yayınlayın</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <div className="card p-6 text-center hover:shadow-lg transition-all duration-200 ease-out-expo">
            <div className="w-12 h-12 rounded-xl bg-success-100 text-success-600 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Pulsuz</h3>
            <p className="text-sm text-gray-500 mb-4">Hər ay</p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">0 AZN</span>
              <p className="text-sm text-gray-500 mt-1">{freeQuota} vakansiya / ay</p>
            </div>
            <ul className="space-y-2 text-sm text-left mb-6">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Standart vakansiya</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> {duration} gün aktiv</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Şirkət profili</li>
              <li className="flex items-center gap-2 text-gray-400"><Check className="w-4 h-4" /> Premium bölmədə yerləşmə</li>
            </ul>
            <Link to="/qeydiyyat" className="btn-secondary w-full block text-center">Pulsuz başla</Link>
          </div>

          {/* Standard */}
          <div className="card p-6 text-center border-2 border-primary-200 hover:shadow-lg transition-all duration-200 ease-out-expo">
            <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Standart</h3>
            <p className="text-sm text-gray-500 mb-4">Vakansiya başına</p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-primary-700">{standardPrice.toFixed(0)} AZN</span>
              <p className="text-sm text-gray-500 mt-1">{duration} gün üçün</p>
            </div>
            <ul className="space-y-2 text-sm text-left mb-6">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Standart vakansiya</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> {duration} gün aktiv</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Bütün filtrlərdə görünür</li>
              <li className="flex items-center gap-2 text-gray-400"><Check className="w-4 h-4" /> Premium üstünlük</li>
            </ul>
            <Link to="/qeydiyyat" className="btn-primary w-full block text-center">Elan yerləşdir</Link>
          </div>

          {/* Premium */}
          <div className="card p-6 text-center ring-2 ring-accent-200 bg-gradient-to-br from-white to-accent-50/40 relative hover:shadow-lg transition-all duration-200 ease-out-expo">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="badge bg-accent-500 text-white px-3 py-1 shadow-md">
                <Star className="w-3 h-3 fill-white" /> Məşhur
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center mx-auto mb-4">
              <Star className="w-6 h-6 fill-accent-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Premium</h3>
            <p className="text-sm text-gray-500 mb-4">Vakansiya başına</p>
            <div className="mb-4">
              <span className="text-4xl font-bold text-accent-600">{premiumPrice.toFixed(0)} AZN</span>
              <p className="text-sm text-gray-500 mt-1">{duration} gün üçün</p>
            </div>
            <ul className="space-y-2 text-sm text-left mb-6">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Premium vakansiya</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> {duration} gün aktiv</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Premium bölmədə üst sırada</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success-500" /> Xüsusi nişanlama</li>
            </ul>
            <Link to="/qeydiyyat" className="btn-accent w-full block text-center">Premium elan</Link>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="card p-5 text-center hover:shadow-md transition-all duration-200 ease-out-expo">
              <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-5 h-5" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">{f.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gray-50 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-600">
            <strong>Ödəniş:</strong> Ödənişlər Azərbaycanda fəaliyyət göstərən ödəniş sistemləri vasitəsilə həyata keçirilir.
            Ödəniş təsdiqləndikdən sonra elan dərc olunur.
          </p>
        </div>
      </div>
    </Layout>
  );
}
