import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLookupData } from '@/hooks/useLookupData';
import { CVPreview } from './CreateCVWizard';
import type { CandidateCV } from '@/types';

type CVForm = React.ComponentProps<typeof CVPreview>['form'];

function cvToForm(c: CandidateCV): CVForm {
  return {
    title: c.title || 'CV',
    profession: c.profession || '',
    min_salary: c.min_salary !== null ? String(c.min_salary) : '',
    specialty: c.specialty || '',
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    patronymic: c.patronymic || '',
    birth_date: c.birth_date || '',
    gender: (c.gender || '') as CVForm['gender'],
    city_id: c.city_id || '',
    photo_path: c.photo_path || null,
    education_level: (c.education_level || '') as CVForm['education_level'],
    education_details: c.education_details || '',
    experience_duration: (c.experience_duration || '') as CVForm['experience_duration'],
    experience_details: c.experience_details || '',
    about: c.about || '',
    skills: c.skills || '',
    phone: c.phone || '',
    email: c.email || '',
  };
}

export default function CVDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const { cities, loading: lookupLoading } = useLookupData();
  const [cv, setCv] = useState<CandidateCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!params.id || !user) { setLoading(false); return; }
      const { data } = await supabase
        .from('candidate_cv_data')
        .select('*, city:cities(*)')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mounted) return;
      setCv(data as unknown as CandidateCV | null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [params.id, user]);

  async function handleDelete() {
    if (!cv || !user) return;
    if (cv.photo_path) {
      await supabase.storage.from('candidate-photos').remove([cv.photo_path]);
    }
    const { error } = await supabase
      .from('candidate_cv_data')
      .delete()
      .eq('id', cv.id)
      .eq('user_id', user.id);
    if (error) {
      alert('CV silinmədi: ' + error.message);
      return;
    }
    navigate('/namized/dashboard/cv-lerim');
  }

  if (loading || lookupLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  if (!cv) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">CV tapılmadı</h3>
        <p className="text-gray-500 mb-4">Bu CV mövcud deyil və ya sizə aid deyil.</p>
        <Link to="/namized/dashboard/cv-lerim" className="btn-primary text-sm">CV-lərimə qayıt</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link to="/namized/dashboard/cv-lerim" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> CV-lərimə qayıt
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/namized/dashboard/yeni-cv/${cv.id}`}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Pencil className="w-4 h-4" /> Redaktə et
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-secondary text-sm flex items-center gap-2 text-red-600"
          >
            <Trash2 className="w-4 h-4" /> Sil
          </button>
        </div>
      </div>

      <CVPreview form={cvToForm(cv)} cities={cities} />

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">CV-ni silin?</h3>
            <p className="text-sm text-gray-500 mb-4">Bu əməliyyat geri qaytarıla bilməz.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-sm">Ləğv et</button>
              <button onClick={handleDelete} className="btn-danger text-sm">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
