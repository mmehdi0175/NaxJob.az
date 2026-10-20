import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Search, MapPin, Briefcase, User, Mail, Phone, Download,
  Eye, EyeOff, Upload, Edit3, AlertCircle, Users, UserCircle,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLookupData } from '@/hooks/useLookupData';
import { NAXCIVAN_REGION_SLUGS } from '@/lib/constants';
import type { Candidate } from '@/types';

export default function CVPage() {
  const { user, loading: authLoading } = useAuth();
  const { cities } = useLookupData();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [error, setError] = useState('');

  const isEmployer = user?.role === 'employer';
  const isCandidate = user?.role === 'candidate';

  useEffect(() => {
    async function loadCandidates() {
      setLoading(true);
      setError('');

      let query = supabase
        .from('candidates')
        .select('*, city:cities(*)')
        .eq('cv_visible', true)
        .not('profession', 'is', null)
        .order('updated_at', { ascending: false });

      if (search.trim()) {
        query = query.or(`profession.ilike.%${search.trim()}%,skills.ilike.%${search.trim()}%,first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%`);
      }

      if (cityFilter) {
        query = query.eq('city_id', cityFilter);
      }

      const { data, error: err } = await query.limit(20);

      if (err) {
        setError('CV-lər yüklənə bilmədi.');
        setCandidates([]);
      } else {
        setCandidates((data as unknown as Candidate[]) || []);
      }
      setLoading(false);
    }

    if (!authLoading) {
      loadCandidates();
    }
  }, [authLoading, search, cityFilter]);

  const regions = cities.filter((c) => NAXCIVAN_REGION_SLUGS.includes(c.slug as typeof NAXCIVAN_REGION_SLUGS[number]));

  if (authLoading) {
    return (
      <Layout>
        <Spinner size={40} className="min-h-[60vh]" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">CV-lər</h1>
          <p className="text-primary-100 max-w-2xl mx-auto">
            Namizədlərin CV-lərini axtarın və uyğun işçiləri tapın
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Candidate CTA */}
        {isCandidate && (
          <div className="card p-5 mb-6 flex items-center justify-between gap-4 border-primary-200 bg-primary-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                <UserCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">CV-nizi idarə edin</p>
                <p className="text-sm text-gray-500">CV məlumatlarınızı yeniləyin və ya CV faylı yükləyin</p>
              </div>
            </div>
            <Link to="/namized/dashboard" className="btn-primary text-sm whitespace-nowrap">
              CV-ni idarə et
            </Link>
          </div>
        )}

        {/* Search bar */}
        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Peşə, vəzifə, bacarıq axtar..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm bg-white"
          >
            <option value="">Bütün şəhərlər</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name_az}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <Spinner size={32} className="py-12" />
        ) : candidates.length > 0 ? (
          <>
            <p className="text-sm text-gray-500 mb-4">{candidates.length} namizəd tapıldı</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((c) => (
                <CandidateCard key={c.id} candidate={c} isEmployer={isEmployer} />
              ))}
            </div>
          </>
        ) : (
          <div className="card p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">CV tapılmadı</h3>
            <p className="text-gray-500">
              {search || cityFilter
                ? 'Axtarış filtrinizi dəyişdirərək yenidən cəhd edin.'
                : 'Hal-hazırda görünür CV yoxdur.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function CandidateCard({ candidate, isEmployer }: { candidate: Candidate; isEmployer: boolean }) {
  const fullName = `${candidate.first_name} ${candidate.last_name} ${candidate.patronymic}`;
  const initials = `${candidate.first_name[0] || ''}${candidate.last_name[0] || ''}`.toUpperCase();

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {isEmployer ? fullName : `${candidate.first_name} ${candidate.last_name}`}
          </h3>
          {candidate.profession && (
            <p className="text-sm text-primary-600 font-medium truncate">{candidate.profession}</p>
          )}
        </div>
      </div>

      {candidate.bio && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{candidate.bio}</p>
      )}

      <div className="space-y-1.5 text-sm text-gray-500">
        {candidate.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" /> {candidate.city.name_az}
          </div>
        )}
        {candidate.experience_years !== null && (
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-gray-400" /> {candidate.experience_years} il təcrübə
          </div>
        )}
        {candidate.skills && (
          <div className="flex items-start gap-1.5">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
            <span className="line-clamp-1">{candidate.skills}</span>
          </div>
        )}
      </div>

      {candidate.cv_file_path && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {isEmployer ? (
            <DownloadCVButton path={candidate.cv_file_path} />
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <FileText className="w-3.5 h-3.5" /> CV mövcuddur
            </div>
          )}
        </div>
      )}

      {isEmployer && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-gray-400" /> {candidate.email}
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-gray-400" /> {candidate.phone}
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadCVButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(path, 60);
    if (data) {
      window.open(data.signedUrl, '_blank');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
    >
      <Download className="w-4 h-4" /> {loading ? 'Açılır...' : 'CV-ni yüklə'}
    </button>
  );
}
