import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Eye, Trash2, AlertCircle, MapPin, Briefcase, Download,
  UserCircle, Pencil,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CV_EDUCATION_LEVEL_LABELS, CV_EXPERIENCE_DURATION_LABELS,
} from '@/lib/constants';
import type { Candidate, CandidateCV } from '@/types';

export default function MyCVs() {
  const { user, refreshCandidate } = useAuth();
  const [cvs, setCvs] = useState<CandidateCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('candidate_cv_data')
        .select('*, city:cities(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!mounted) return;
      setCvs((data as unknown as CandidateCV[]) || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [user]);

  async function handleDelete(cvId: string) {
    if (!user) return;
    const target = cvs.find((c) => c.id === cvId);
    if (target?.photo_path) {
      await supabase.storage.from('candidate-photos').remove([target.photo_path]);
    }
    const { error } = await supabase
      .from('candidate_cv_data')
      .delete()
      .eq('id', cvId)
      .eq('user_id', user.id);
    if (error) {
      alert('CV silinmədi: ' + error.message);
      return;
    }
    setCvs((prev) => prev.filter((c) => c.id !== cvId));
    setShowDeleteConfirm(null);
  }

  async function handleDownload() {
    if (!user?.candidate?.cv_file_path) return;
    setDownloadLoading(true);
    const { data, error } = await supabase.storage
      .from('cvs')
      .createSignedUrl(user.candidate.cv_file_path, 60);
    if (data) window.open(data.signedUrl, '_blank');
    if (error) alert('CV açıla bilmədi: ' + error.message);
    setDownloadLoading(false);
  }

  async function toggleVisibility(cvId: string, currentActive: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from('candidate_cv_data')
      .update({ is_active: !currentActive })
      .eq('id', cvId)
      .eq('user_id', user.id);
    if (error) {
      alert('Status dəyişdirilmədi: ' + error.message);
      return;
    }
    setCvs((prev) => prev.map((c) => c.id === cvId ? { ...c, is_active: !currentActive } : c));
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CV-lərim</h1>
        <Link to="/namized/dashboard/yeni-cv" className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Yeni CV
        </Link>
      </div>

      {cvs.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">CV tapılmadı</h3>
          <p className="text-gray-500 mb-4">Hələ CV yaratmamısınız. İlk CV-nizi yaradın.</p>
          <Link to="/namized/dashboard/yeni-cv" className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> CV yarat
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cvs.map((cv) => {
            const fullName = [cv.last_name, cv.first_name, cv.patronymic].filter(Boolean).join(' ') || 'Adsız CV';
            return (
              <div key={cv.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{cv.title}</h3>
                      <span className={cv.is_active ? 'badge bg-success-100 text-success-700 text-xs' : 'badge bg-gray-100 text-gray-500 text-xs'}>
                        {cv.is_active ? 'Aktiv' : 'Passiv'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{fullName}</span>
                      {cv.profession && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{cv.profession}</span>}
                      {cv.city?.name_az && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{cv.city.name_az}</span>}
                      {cv.experience_duration && <span>{CV_EXPERIENCE_DURATION_LABELS[cv.experience_duration]}</span>}
                      {cv.education_level && <span>{CV_EDUCATION_LEVEL_LABELS[cv.education_level]}</span>}
                      <span>{new Date(cv.created_at).toLocaleDateString('az')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/namized/dashboard/cv-lerim/${cv.id}`}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Bax"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/namized/dashboard/yeni-cv/${cv.id}`}
                      className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      title="Redaktə et"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setShowDeleteConfirm(cv.id)}
                      className="p-2 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy simple CV card (from candidates table) */}
      <LegacySimpleCVCard user={user} onDownload={handleDownload} downloadLoading={downloadLoading} />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">CV-ni silin?</h3>
            <p className="text-sm text-gray-500 mb-4">Bu əməliyyat geri qaytarıla bilməz.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary text-sm">Ləğv et</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-danger text-sm">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegacySimpleCVCard({
  user, onDownload, downloadLoading,
}: {
  user: ReturnType<typeof useAuth>['user'];
  onDownload: () => void;
  downloadLoading: boolean;
}) {
  const [candidate, setCandidate] = useState<Candidate | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { if (mounted) setCandidate(null); return; }
      const { data } = await supabase
        .from('candidates')
        .select('*, city:cities(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (mounted) setCandidate(data as unknown as Candidate | null);
    })();
    return () => { mounted = false; };
  }, [user]);

  if (candidate === undefined || !candidate) return null;
  if (!candidate.cv_file_path) return null;

  return (
    <div className="card p-5 border-dashed border-gray-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">Yüklənmiş CV faylı</p>
            <p className="text-xs text-gray-500 truncate">
              {candidate.profession || 'Peşə qeyd edilməyib'} · {candidate.city?.name_az || 'Şəhər yoxdur'}
            </p>
          </div>
        </div>
        <button
          onClick={onDownload}
          disabled={downloadLoading}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors shrink-0"
        >
          <Download className="w-4 h-4" /> {downloadLoading ? 'Açılır...' : 'Yüklə'}
        </button>
      </div>
    </div>
  );
}
