import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, City } from '@/types';
import { NAXCIVAN_REGION_SLUGS } from '@/lib/constants';

export function useLookupData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [catRes, cityRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('cities').select('*').order('sort_order'),
      ]);
      const allCities = (cityRes.data as City[]) || [];
      setCategories((catRes.data as Category[]) || []);
      setCities(allCities);
      setRegions(allCities.filter(c => NAXCIVAN_REGION_SLUGS.includes(c.slug as typeof NAXCIVAN_REGION_SLUGS[number])));
      setLoading(false);
    }
    load();
  }, []);

  return { categories, cities, regions, loading };
}
