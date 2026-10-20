import { useNavigate } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { Search, MapPin, Briefcase } from 'lucide-react';

interface SearchBarProps {
  initialKeyword?: string;
  initialCity?: string;
  initialCategory?: string;
  regions: { id: string; name_az: string }[];
  categories: { id: string; name_az: string }[];
  variant?: 'hero' | 'inline';
}

export default function SearchBar({
  initialKeyword = '',
  initialCity = '',
  initialCategory = '',
  regions,
  categories,
  variant = 'hero',
}: SearchBarProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (city) params.set('bolge', city);
    if (category) params.set('kategoriya', category);
    navigate(`/vakansiyalar?${params.toString()}`);
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Vəzifə adı, açar söz..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm bg-white"
        >
          <option value="">Bütün kategoriyalar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_az}</option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none text-sm bg-white"
        >
          <option value="">Bütün şəhərlər</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name_az}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm whitespace-nowrap">
          <Search className="w-4 h-4 inline mr-1" /> Axtar
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 max-w-4xl mx-auto"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Vəzifə adı və ya açar söz daxil edin..."
            className="w-full pl-10 pr-4 py-3.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none"
          />
        </div>

        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full md:w-auto pl-10 pr-8 py-3.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none bg-white text-gray-700 appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="">Kateqoriya</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_az}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full md:w-auto pl-10 pr-8 py-3.5 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none bg-white text-gray-700 appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="">Şəhər</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name_az}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary py-3.5 whitespace-nowrap">
          <Search className="w-5 h-5 inline mr-1.5" /> Axtar
        </button>
      </div>
    </form>
  );
}
