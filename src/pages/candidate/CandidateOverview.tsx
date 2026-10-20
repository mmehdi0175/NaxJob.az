import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, FileText, PlusCircle, Settings, Briefcase, MapPin, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CV_EXPERIENCE_DURATION_LABELS, CV_EDUCATION_LEVEL_LABELS,
} from '@/lib/constants';
import type { CandidateCV } from '@/types';

export default function CandidateOverview() {
  const { user } = useAuth();
  const candidate = user?.candidate;
  const [cvs, setCvs] = useState<CandidateCV[]>([]);
  const [loadingCvs, setLoadingCvs] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setLoadingCvs(false); return; }
      const { data } = await supabase
        .from('candidate_cv_data')
        .select('*, city:cities(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!mounted) return;
      setCvs((data as unknown as CandidateCV[]) || []);
      setLoadingCvs(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  const activeCvs = cvs.filter((c) => c.is_active);
  const latestCv = cvs[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Xoş gəldiniz{candidate ? `, ${candidate.first_name}` : ''}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">CV-nizi idarə edin və uyğun iş imkanlarını kəşf edin.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/namized/dashboard/profil"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Profilim</h3>
            <p className="text-sm text-gray-500 truncate">Şəxsi məlumatlarınızı redaktə edin</p>
          </div>
        </Link>

        <Link
          to="/namized/dashboard/yeni-cv"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">Yeni CV</h3>
            <p className="text-sm text-gray-500 truncate">6 addımda CV yaradın</p>
          </div>
        </Link>
      </div>

      {/* CV status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">CV statusu</h2>
          <Link to="/namized/dashboard/cv-lerim" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            CV-lərimə bax
          </Link>
        </div>

        {loadingCvs ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : cvs.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Hələ CV yaratmamısınız.</p>
            <Link to="/namized/dashboard/yeni-cv" className="btn-primary inline-flex items-center gap-2 text-sm">
              <PlusCircle className="w-4 h-4" /> CV yarat
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Ümumi CV</p>
                <p className="text-xl font-bold text-gray-900">{cvs.length}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-3">
                <p className="text-xs text-success-600">Aktiv CV</p>
                <p className="text-xl font-bold text-success-700">{activeCvs.length}</p>
              </div>
            </div>

            {latestCv && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Son CV</p>
                <Link to={`/namized/dashboard/cv-lerim/${latestCv.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                  <div className="flex items-center gap-2 flex-wrap text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{latestCv.title}</span>
                    {latestCv.profession && (
                      <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-gray-400" />{latestCv.profession}</span>
                    )}
                    {latestCv.city?.name_az && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{latestCv.city.name_az}</span>
                    )}
                    {latestCv.experience_duration && (
                      <span>{CV_EXPERIENCE_DURATION_LABELS[latestCv.experience_duration]}</span>
                    )}
                    {latestCv.education_level && (
                      <span>{CV_EDUCATION_LEVEL_LABELS[latestCv.education_level]}</span>
                    )}
                    <span className={latestCv.is_active ? 'badge bg-success-100 text-success-700 text-xs' : 'badge bg-gray-100 text-gray-500 text-xs'}>
                      {latestCv.is_active ? 'Aktiv' : 'Passiv'}
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile shortcut */}
      <div className="card p-5 flex items-center gap-4 border-primary-200 bg-primary-50/50">
        <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">Profilim</p>
          <p className="text-sm text-gray-500">Şəxsi profil məlumatlarınızı yeniləyin</p>
        </div>
        <Link to="/namized/dashboard/profil" className="btn-primary text-sm whitespace-nowrap">
          Profili idarə et
        </Link>
      </div>
    </div>
  );
}
