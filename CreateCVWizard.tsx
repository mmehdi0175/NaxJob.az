import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle, Upload, X, UserCircle,
  Briefcase, GraduationCap, FileText, Mail, Phone, MapPin, Calendar,
  Eye, Save, Loader2, Pencil
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLookupData } from '@/hooks/useLookupData';
import { cn } from '@/lib/utils';
import {
  CV_EDUCATION_LEVEL_OPTIONS, CV_EDUCATION_LEVEL_LABELS,
  CV_EXPERIENCE_DURATION_OPTIONS, CV_EXPERIENCE_DURATION_LABELS,
  CV_GENDER_LABELS,
} from '@/lib/constants';
import type {
  CandidateCV, EducationLevel, ExperienceDuration, Gender, City,
} from '@/types';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 'review';

const TOTAL_STEPS = 6;

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface CVForm {
  title: string;
  profession: string;
  min_salary: string;
  specialty: string;
  first_name: string;
  last_name: string;
  patronymic: string;
  birth_date: string;
  gender: Gender | '';
  city_id: string;
  photo_path: string | null;
  education_level: EducationLevel | '';
  education_details: string;
  experience_duration: ExperienceDuration | '';
  experience_details: string;
  about: string;
  skills: string;
  phone: string;
  email: string;
}

const emptyForm: CVForm = {
  title: 'CV',
  profession: '',
  min_salary: '',
  specialty: '',
  first_name: '',
  last_name: '',
  patronymic: '',
  birth_date: '',
  gender: '',
  city_id: '',
  photo_path: null,
  education_level: '',
  education_details: '',
  experience_duration: '',
  experience_details: '',
  about: '',
  skills: '',
  phone: '',
  email: '',
};

const STEP_META: { step: Step; title: string; icon: typeof Briefcase }[] = [
  { step: 1, title: 'Vəzifə', icon: Briefcase },
  { step: 2, title: 'Şəxsi məlumatlar', icon: UserCircle },
  { step: 3, title: 'Təhsil', icon: GraduationCap },
  { step: 4, title: 'İş təcrübəsi', icon: FileText },
  { step: 5, title: 'Özünüz haqqında', icon: Pencil },
  { step: 6, title: 'Əlaqə', icon: Mail },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned);
}

function formatDateAz(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('az', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function skillsArray(skills: string | null): string[] {
  if (!skills) return [];
  return skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

export default function CreateCVWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { cities, loading: lookupLoading } = useLookupData();

  const cvId = params.cvId;
  const isEdit = !!cvId;
  const initialStepParam = Number(searchParams.get('step')) || 1;

  const [form, setForm] = useState<CVForm>(emptyForm);
  const [step, setStep] = useState<Step>((initialStepParam >= 1 && initialStepParam <= 6 ? initialStepParam : 1) as Step);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  function update<K extends keyof CVForm>(key: K, value: CVForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Load existing CV for edit
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!cvId || !user) { setLoadingExisting(false); return; }
      const { data } = await supabase
        .from('candidate_cv_data')
        .select('*')
        .eq('id', cvId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        const c = data as unknown as CandidateCV;
        setForm({
          title: c.title || 'CV',
          profession: c.profession || '',
          min_salary: c.min_salary !== null ? String(c.min_salary) : '',
          specialty: c.specialty || '',
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          patronymic: c.patronymic || '',
          birth_date: c.birth_date || '',
          gender: c.gender || '',
          city_id: c.city_id || '',
          photo_path: c.photo_path || null,
          education_level: c.education_level || '',
          education_details: c.education_details || '',
          experience_duration: c.experience_duration || '',
          experience_details: c.experience_details || '',
          about: c.about || '',
          skills: c.skills || '',
          phone: c.phone || '',
          email: c.email || '',
        });
        if (c.photo_path) setPhotoPreview(c.photo_path);
      }
      setLoadingExisting(false);
    })();
    return () => { mounted = false; };
  }, [cvId, user]);

  // Pre-fill email and phone from auth user
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      email: prev.email || user.email || '',
      phone: prev.phone || user.candidate?.phone || '',
      first_name: prev.first_name || user.candidate?.first_name || '',
      last_name: prev.last_name || user.candidate?.last_name || '',
      patronymic: prev.patronymic || user.candidate?.patronymic || '',
    }));
  }, [user]);

  const stepErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!form.profession.trim()) e.profession = 'Peşə/vəzifə tələb olunur.';
    }
    if (step === 2) {
      if (!form.last_name.trim()) e.last_name = 'Soyad tələb olunur.';
      if (!form.first_name.trim()) e.first_name = 'Ad tələb olunur.';
      if (!form.patronymic.trim()) e.patronymic = 'Ata adı tələb olunur.';
      if (!form.birth_date) e.birth_date = 'Doğum tarixi tələb olunur.';
      if (!form.gender) e.gender = 'Cins seçilməlidir.';
    }
    if (step === 3) {
      if (!form.education_level) e.education_level = 'Təhsil dərəcəsi seçilməlidir.';
    }
    if (step === 4) {
      if (!form.experience_duration) e.experience_duration = 'Təcrübə müddəti seçilməlidir.';
    }
    if (step === 5) {
      if (!form.about.trim()) e.about = 'Haqqımda sahəsi tələb olunur.';
    }
    if (step === 6) {
      if (!form.phone.trim() || !isValidPhone(form.phone)) e.phone = 'Düzgün telefon nömrəsi daxil edin.';
      if (!form.email.trim() || !isValidEmail(form.email)) e.email = 'Düzgün email ünvanı daxil edin.';
    }
    return e;
  }, [step, form]);

  const canGoNext = Object.keys(stepErrors).length === 0;

  function handlePhotoSelect(file: File | null) {
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE) {
      setError('Şəkil ölçüsü 5MB-dan çox olmamalıdır.');
      return;
    }
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setError('Yalnız JPG, PNG və WEBP formatları qəbul olunur.');
      return;
    }
    setError('');
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    update('photo_path', null);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile || !user) return form.photo_path;
    const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    setUploadingPhoto(true);
    // Remove previous photo if exists
    if (form.photo_path && form.photo_path !== path) {
      await supabase.storage.from('candidate-photos').remove([form.photo_path]);
    }
    const { error: upErr } = await supabase.storage
      .from('candidate-photos')
      .upload(path, photoFile, { contentType: photoFile.type, upsert: false });
    setUploadingPhoto(false);
    if (upErr) {
      setError('Şəklin yüklənməsi zamanı xəta: ' + upErr.message);
      return null;
    }
    return path;
  }

  function goNext() {
    if (!canGoNext) return;
    if (step === 6) {
      setStep('review');
    } else if (typeof step === 'number') {
      setStep((step + 1) as Step);
    }
  }

  function goBack() {
    if (step === 'review') {
      setStep(6);
    } else if (typeof step === 'number' && step > 1) {
      setStep((step - 1) as Step);
    }
  }

  function goToStep(target: Step) {
    setStep(target);
  }

  async function handleSave(): Promise<string | null> {
    setError('');
    setSuccess('');
    if (!user) return null;

    let photoPath = form.photo_path;
    if (photoFile) {
      const uploaded = await uploadPhoto();
      if (uploaded === null && photoFile) return null;
      photoPath = uploaded;
    }

    const payload = {
      title: form.title.trim() || 'CV',
      profession: form.profession.trim() || null,
      min_salary: form.min_salary.trim() === '' ? null : Number(form.min_salary),
      specialty: form.specialty.trim() || null,
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      patronymic: form.patronymic.trim() || null,
      birth_date: form.birth_date || null,
      gender: form.gender || null,
      city_id: form.city_id || null,
      photo_path: photoPath,
      education_level: form.education_level || null,
      education_details: form.education_details.trim() || null,
      experience_duration: form.experience_duration || null,
      experience_details: form.experience_details.trim() || null,
      about: form.about.trim() || null,
      skills: form.skills.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    };

    setSaving(true);
    let savedId: string | null = null;
    if (isEdit && cvId) {
      const { error: updErr } = await supabase
        .from('candidate_cv_data')
        .update(payload)
        .eq('id', cvId)
        .eq('user_id', user.id);
      if (updErr) {
        setError('CV yenilənmədi: ' + updErr.message);
        setSaving(false);
        return null;
      }
      savedId = cvId;
    } else {
      const { data, error: insErr } = await supabase
        .from('candidate_cv_data')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single();
      if (insErr) {
        setError('CV saxlanıla bilmədi: ' + insErr.message);
        setSaving(false);
        return null;
      }
      savedId = data?.id || null;
    }
    setSaving(false);
    return savedId;
  }

  async function handleSaveOnly() {
    const id = await handleSave();
    if (id) {
      setSuccess('CV yadda saxlanıldı.');
      setTimeout(() => navigate('/namized/dashboard/cv-lerim'), 700);
    }
  }

  async function handleSaveAndShow() {
    const id = await handleSave();
    if (id) {
      setSuccess('CV yadda saxlanıldı.');
      setTimeout(() => navigate(`/namized/dashboard/cv-lerim/${id}`), 700);
    }
  }

  if (loadingExisting || lookupLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>;
  }

  // REVIEW step — structured CV preview
  if (step === 'review') {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">CV-nin yekun görünüşü</h1>
          <button onClick={() => setStep(6)} className="btn-secondary flex items-center gap-2 text-sm">
            <Pencil className="w-4 h-4" /> Redaktə et
          </button>
        </div>

        {error && <ErrorBox message={error} />}
        {success && <SuccessBox message={success} />}

        <CVPreview form={form} cities={cities} />

        <div className="flex flex-wrap gap-3 justify-end">
          <button onClick={goBack} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Geri
          </button>
          <button
            onClick={handleSaveAndShow}
            disabled={saving || uploadingPhoto}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> {saving ? 'Saxlanılır...' : 'Saxla və bax'}
          </button>
          <button
            onClick={handleSaveOnly}
            disabled={saving || uploadingPhoto}
            className={cn('btn-primary flex items-center gap-2', (saving || uploadingPhoto) && 'opacity-60 cursor-not-allowed')}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saxlanılır...' : 'Yadda saxla'}
          </button>
        </div>
      </div>
    );
  }

  const currentStepNum = step as number;
  const stepMeta = STEP_META.find((s) => s.step === step)!;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'CV-ni redaktə et' : 'Yeni CV'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Xoş gəlmisiniz! CV-nizi yaratmaq üçün sizə 6 addımdan ibarət qısa proses təqdim edirik. Məlumatları ardıcıl daxil edin. Bütün addımlar tamamlandıqdan sonra hazır CV-nizi nəzərdən keçirə biləcəksiniz.
        </p>
      </div>

      {/* Stepper */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {STEP_META.map((s, idx) => {
            const Icon = s.icon;
            const sNum = s.step as number;
            const isDone = currentStepNum > sNum;
            const isCurrent = currentStepNum === sNum;
            return (
              <div key={s.step} className="flex items-center flex-1 min-w-0 last:flex-none">
                <button
                  type="button"
                  onClick={() => isDone && goToStep(s.step)}
                  disabled={!isDone}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium shrink-0',
                    isCurrent ? 'text-primary-700' : isDone ? 'text-success-700 cursor-pointer hover:text-success-800' : 'text-gray-400'
                  )}
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    isCurrent ? 'bg-primary-600 text-white' : isDone ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-400'
                  )}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </span>
                  <span className="hidden md:inline whitespace-nowrap">{s.title}</span>
                </button>
                {idx < STEP_META.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-1 sm:mx-2 rounded shrink', isDone ? 'bg-success-200' : 'bg-gray-200')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {success && <SuccessBox message={success} />}

      {/* Step content */}
      <form
        className="card p-6 space-y-5"
        onSubmit={(e: FormEvent) => { e.preventDefault(); goNext(); }}
      >
        {step === 1 && (
          <>
            <StepHeader num={1} title="Vəzifə" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peşə və ya vəzifə *</label>
              <input
                type="text"
                value={form.profession}
                onChange={(e) => update('profession', e.target.value)}
                placeholder="məs. Mühasib"
                className="input-field"
              />
              {stepErrors.profession && <FieldError message={stepErrors.profession} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gözlənilən minimum maaş (AZN)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={form.min_salary}
                onChange={(e) => update('min_salary', e.target.value)}
                placeholder="məs. 800"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İxtisas</label>
              <input
                type="text"
                value={form.specialty}
                onChange={(e) => update('specialty', e.target.value)}
                placeholder="məs. İnformasiya texnologiyaları"
                className="input-field"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader num={2} title="Şəxsi məlumatlar" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Soyadı *</label>
                <input type="text" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} className="input-field" placeholder="Soyad" />
                {stepErrors.last_name && <FieldError message={stepErrors.last_name} />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adı *</label>
                <input type="text" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} className="input-field" placeholder="Ad" />
                {stepErrors.first_name && <FieldError message={stepErrors.first_name} />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ata adı *</label>
                <input type="text" value={form.patronymic} onChange={(e) => update('patronymic', e.target.value)} className="input-field" placeholder="Ata adı" />
                {stepErrors.patronymic && <FieldError message={stepErrors.patronymic} />}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doğum tarixi *</label>
                <input type="date" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} className="input-field" />
                {stepErrors.birth_date && <FieldError message={stepErrors.birth_date} />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cins *</label>
                <div className="flex gap-2">
                  {(['male', 'female'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update('gender', g)}
                      className={cn(
                        'flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                        form.gender === g
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {CV_GENDER_LABELS[g]}
                    </button>
                  ))}
                </div>
                {stepErrors.gender && <FieldError message={stepErrors.gender} />}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yaşadığı şəhər</label>
              <select value={form.city_id} onChange={(e) => update('city_id', e.target.value)} className="input-field bg-white">
                <option value="">Seçin</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_az}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CV üçün fotoşəkil</label>
              {photoPreview ? (
                <div className="flex items-center gap-4">
                  <img src={photoPreview} alt="Profil" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  <div className="flex gap-2">
                    <label className="btn-secondary text-sm cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-4 h-4" /> Dəyiş
                      <input type="file" accept={ACCEPTED_PHOTO_TYPES.join(',')} onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                    <button type="button" onClick={removePhoto} className="btn-secondary text-sm flex items-center gap-1.5 text-red-600">
                      <X className="w-4 h-4" /> Sil
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-primary-400 transition-colors">
                  {uploadingPhoto ? <Loader2 className="w-6 h-6 text-primary-600 animate-spin" /> : <Upload className="w-6 h-6 text-gray-400" />}
                  <span className="text-sm text-gray-500">{uploadingPhoto ? 'Yüklənir...' : 'Şəkil seçin (JPG, PNG, WEBP — maks. 5MB)'}</span>
                  <input type="file" accept={ACCEPTED_PHOTO_TYPES.join(',')} onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
                </label>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepHeader num={3} title="Təhsil" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Təhsil dərəcəsi *</label>
              <select value={form.education_level} onChange={(e) => update('education_level', e.target.value as EducationLevel)} className="input-field bg-white">
                <option value="">Seçin</option>
                {CV_EDUCATION_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {stepErrors.education_level && <FieldError message={stepErrors.education_level} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Təhsil haqqında ətraflı məlumat</label>
              <textarea
                value={form.education_details}
                onChange={(e) => update('education_details', e.target.value)}
                placeholder="Təhsil müəssisəsi, fakültə, ixtisas, təhsil illəri..."
                rows={5}
                className="input-field resize-y"
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <StepHeader num={4} title="İş təcrübəsi" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İş təcrübəsi müddəti *</label>
              <select value={form.experience_duration} onChange={(e) => update('experience_duration', e.target.value as ExperienceDuration)} className="input-field bg-white">
                <option value="">Seçin</option>
                {CV_EXPERIENCE_DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {stepErrors.experience_duration && <FieldError message={stepErrors.experience_duration} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İş təcrübəsi haqqında ətraflı məlumat</label>
              <textarea
                value={form.experience_details}
                onChange={(e) => update('experience_details', e.target.value)}
                placeholder={form.experience_duration === 'none' ? 'Təcrübəsiz — bu sahəni boş saxlaya bilərsiniz' : 'Əvvəlki iş yerləri, vəzifələr, iş dövrləri...'}
                rows={5}
                className="input-field resize-y"
              />
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <StepHeader num={5} title="Özünüz haqqında" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Haqqımda *</label>
              <textarea
                value={form.about}
                onChange={(e) => update('about', e.target.value)}
                placeholder="Özünüz, peşəkar məqsədləriniz və iş keyfiyyətləriniz barədə..."
                rows={5}
                className="input-field resize-y"
              />
              {stepErrors.about && <FieldError message={stepErrors.about} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bacarıqlar</label>
              <textarea
                value={form.skills}
                onChange={(e) => update('skills', e.target.value)}
                placeholder="Hər bacarığı yeni sətirdə və ya vergül ilə ayırın..."
                rows={4}
                className="input-field resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">Vergül və ya yeni sətir ilə ayırın.</p>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <StepHeader num={6} title="Əlaqə" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon nömrəsi *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+994 50 123 45 67"
                className="input-field"
              />
              {stepErrors.phone && <FieldError message={stepErrors.phone} />}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email ünvanı *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="name@email.com"
                className="input-field"
              />
              {stepErrors.email && <FieldError message={stepErrors.email} />}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStepNum === 1}
            className={cn('btn-secondary flex items-center gap-2', currentStepNum === 1 && 'opacity-40 cursor-not-allowed')}
          >
            <ArrowLeft className="w-4 h-4" /> Geri
          </button>
          <span className="text-sm text-gray-500">Addım {currentStepNum} / {TOTAL_STEPS}</span>
          <button
            type="submit"
            disabled={!canGoNext}
            className={cn('btn-primary flex items-center gap-2', !canGoNext && 'opacity-60 cursor-not-allowed')}
          >
            Növbəti <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function StepHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
      <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">{num}</span>
      <h2 className="font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-success-50 border border-success-200 p-3 text-sm text-success-700">
      <Check className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

// ===== CV Preview =====
export function CVPreview({ form, cities }: { form: CVForm; cities: City[] }) {
  const cityName = cities.find((c) => c.id === form.city_id)?.name_az || '—';
  const skills = skillsArray(form.skills);
  const fullName = [form.last_name, form.first_name, form.patronymic].filter(Boolean).join(' ') || '—';
  const salaryText = form.min_salary ? `${Number(form.min_salary).toLocaleString('az')} AZN` : '—';

  return (
    <div className="card overflow-hidden">
      {/* Header with photo */}
      <div className="bg-gradient-to-br from-primary-50 to-gray-50 p-6 border-b border-gray-100">
        <div className="flex items-start gap-5">
          {form.photo_path || true ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0 bg-white">
              {form.photo_path ? (
                <PhotoView path={form.photo_path} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <UserCircle className="w-12 h-12" />
                </div>
              )}
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
            {form.profession && <p className="text-primary-700 font-medium mt-0.5">{form.profession}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
              {form.specialty && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 text-gray-400" />{form.specialty}</span>}
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{cityName}</span>
              <span className="flex items-center gap-1 text-success-700 font-medium">{salaryText}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <CVSection title="Şəxsi məlumatlar">
          <CVRow label="Ad, soyad, ata adı" value={fullName} />
          <CVRow label="Doğum tarixi" value={formatDateAz(form.birth_date)} icon={<Calendar className="w-3.5 h-3.5 text-gray-400" />} />
          <CVRow label="Cins" value={form.gender ? CV_GENDER_LABELS[form.gender] : '—'} />
          <CVRow label="Şəhər" value={cityName} icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />} />
        </CVSection>

        <CVSection title="Məqsəd və vəzifə">
          <CVRow label="Peşə/vəzifə" value={form.profession || '—'} />
          <CVRow label="Minimum maaş" value={salaryText} />
          <CVRow label="İxtisas" value={form.specialty || '—'} />
        </CVSection>

        <CVSection title="Təhsil">
          <CVRow label="Təhsil dərəcəsi" value={form.education_level ? CV_EDUCATION_LEVEL_LABELS[form.education_level] : '—'} />
          {form.education_details && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Ətraflı məlumat</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.education_details}</p>
            </div>
          )}
        </CVSection>

        <CVSection title="İş təcrübəsi">
          <CVRow label="Təcrübə müddəti" value={form.experience_duration ? CV_EXPERIENCE_DURATION_LABELS[form.experience_duration] : '—'} />
          {form.experience_details && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Ətraflı məlumat</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.experience_details}</p>
            </div>
          )}
        </CVSection>

        <CVSection title="Haqqımda">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.about || '—'}</p>
        </CVSection>

        {skills.length > 0 && (
          <CVSection title="Bacarıqlar">
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={i} className="badge bg-primary-50 text-primary-700 text-xs">{s}</span>
              ))}
            </div>
          </CVSection>
        )}

        <CVSection title="Əlaqə məlumatları">
          <CVRow label="Telefon" value={form.phone || '—'} icon={<Phone className="w-3.5 h-3.5 text-gray-400" />} />
          <CVRow label="Email" value={form.email || '—'} icon={<Mail className="w-3.5 h-3.5 text-gray-400" />} />
        </CVSection>
      </div>
    </div>
  );
}

function CVSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-100">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function CVRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium text-right flex items-center gap-1.5 justify-end">
        {icon}{value}
      </span>
    </div>
  );
}

// Loads a signed URL for a candidate photo path
function PhotoView({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.storage.from('candidate-photos').createSignedUrl(path, 3600);
      if (mounted && data) setUrl(data.signedUrl);
    })();
    return () => { mounted = false; };
  }, [path]);
  return url ? <img src={url} alt="Profil" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 animate-pulse" />;
}
