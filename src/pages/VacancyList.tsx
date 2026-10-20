import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@/components/Layout';
import VacancyCard from '@/components/VacancyCard';
import SearchBar from '@/components/SearchBar';
import { Spinner } from '@/components/Spinner';
import { useLookupData } from '@/hooks/useLookupData';
import { useModalAccessibility } from '@/hooks/useModalAccessibility';
import { supabase } from '@/lib/supabase';
import type { Vacancy } from '@/types';
import { EMPLOYMENT_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 12;

export default function VacancyList() {
  const { categories, regions, loading } = useLookupData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const filterRef = useModalAccessibility(showFilters, () => setShowFilters(false));

  const keyword = searchParams.get('q') || '';
  const cityId = searchParams.get('bolge') || '';
  const subregionQuery = searchParams.get('altBolge') || '';
  const categoryId = searchParams.get('kategoriya') || '';
  const employmentType = searchParams.get('isTipi') || '';
  const vacancyType = searchParams.get('type') || '';
  const salaryMin = searchParams.get('maasMin') || '';
  const sortBy = searchParams.get('sirala') || 'recent';

  const fetchVacancies = useCallback(async () => {
    setListLoading(true);
    let query = supabase
      .from('vacancies')
      .select('*, company:companies(*), category:categories(*), city:cities(*)', { count: 'exact' })
      .eq('status', 'active');

    if (keyword) query = query.ilike('title', `%${keyword}%`);
    if (cityId) query = query.eq('city_id', cityId);
    if (subregionQuery) query = query.ilike('subregion', `%${subregionQuery}%`);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (employmentType) query = query.eq('employment_type', employmentType);
    if (vacancyType) query = query.eq('vacancy_type', vacancyType);
    if (salaryMin) query = query.gte('salary_min', parseFloat(salaryMin));

    query = query.order('vacancy_type', { ascending: false });
    if (sortBy === 'salary') {
      query = query.order('salary_min', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('published_at', { ascending: false, nullsFirst: false });
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count } = await query;
    setVacancies((data as unknown as Vacancy[]) || []);
    setTotal(count || 0);
    setListLoading(false);
  }, [keyword, cityId, subregionQuery, categoryId, employmentType, vacancyType, salaryMin, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [keyword, cityId, subregionQuery, categoryId, employmentType, vacancyType, salaryMin, sortBy]);

  useEffect(() => {
    fetchVacancies();
  }, [fetchVacancies]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams());
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = keyword || cityId || subregionQuery || categoryId || employmentType || vacancyType || salaryMin;

  return (
    <Layout>
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            {vacancyType === 'premium' ? 'Premium vakansiyalar' : 'Bütün vakansiyalar'}
          </h1>
          {!loading && <SearchBar categories={categories} regions={regions} variant="inline" />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className={cn(
            'w-64 shrink-0',
            'lg:block',
            showFilters ? 'fixed inset-0 z-50 bg-black/30 lg:bg-transparent lg:static lg:z-auto' : 'hidden'
          )}>
            {showFilters && (
              <div className="absolute inset-0 lg:hidden" onClick={() => setShowFilters(false)} aria-hidden="true" />
            )}
            <div
              ref={filterRef}
              role="dialog"
              aria-modal="true"
              aria-label="Filtrlər"
              tabIndex={-1}
              className={cn(
                'relative bg-white rounded-xl border border-gray-200 p-5 h-fit lg:sticky lg:top-20 focus:outline-none',
                showFilters ? 'fixed right-0 top-0 bottom-0 w-72 max-w-[85vw] overflow-y-auto rounded-none lg:rounded-xl lg:static lg:w-64' : ''
              )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filtrlər</h3>
                <div className="flex items-center gap-2">
                  {hasFilters && (
                    <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 font-medium">
                      Təmizlə
                    </button>
                  )}
                  <button className="lg:hidden" onClick={() => setShowFilters(false)} aria-label="Filtrləri bağla">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Kateqoriya</label>
                  <select
                    value={categoryId}
                    onChange={(e) => updateFilter('kategoriya', e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Bütün kategoriyalar</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name_az}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Şəhər</label>
                  <select
                    value={cityId}
                    onChange={(e) => updateFilter('bolge', e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Bütün şəhərlər</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name_az}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Ərazi (kənd, qəsəbə)</label>
                  <input
                    type="text"
                    value={subregionQuery}
                    onChange={(e) => updateFilter('altBolge', e.target.value)}
                    placeholder="məs. Nehrəm kəndi"
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">İş tipi</label>
                  <div className="space-y-1.5">
                    {EMPLOYMENT_TYPES.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        <input
                          type="radio"
                          name="employmentType"
                          checked={employmentType === type}
                          onChange={() => updateFilter('isTipi', type)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Vakansiya tipi</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                      <input
                        type="radio"
                        name="vacancyType"
                        checked={!vacancyType}
                        onChange={() => updateFilter('type', '')}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      Hamısı
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                      <input
                        type="radio"
                        name="vacancyType"
                        checked={vacancyType === 'premium'}
                        onChange={() => updateFilter('type', 'premium')}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      Premium
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                      <input
                        type="radio"
                        name="vacancyType"
                        checked={vacancyType === 'standard'}
                        onChange={() => updateFilter('type', 'standard')}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      Standart
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Minimal maaş (AZN)</label>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => updateFilter('maasMin', e.target.value)}
                    placeholder="məs. 500"
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Sıralama</label>
                  <select
                    value={sortBy}
                    onChange={(e) => updateFilter('sirala', e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="recent">Ən yeni</option>
                    <option value="salary">Maaşa görə</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{total}</span> vakansiya tapıldı
              </p>
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-1.5 text-sm font-medium text-gray-700 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filtrlər
              </button>
            </div>

            {listLoading ? (
              <Spinner size={32} className="py-16" />
            ) : vacancies.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {vacancies.map((v) => (
                    <VacancyCard key={v.id} vacancy={v} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
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
                            'w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200',
                            page === p
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="card p-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Vakansiya tapılmadı</h3>
                <p className="text-gray-500">Axtarış filtrinizi dəyişdirərək yenidən cəhd edin.</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="btn-secondary mt-4 text-sm">
                    Filtrləri təmizlə
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
