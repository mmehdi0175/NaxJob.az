import { Link } from 'react-router-dom';
import { MapPin, Briefcase, Clock, Star, Building2, Eye } from 'lucide-react';
import type { Vacancy } from '@/types';
import { formatSalary, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

interface VacancyCardProps {
  vacancy: Vacancy;
  premium?: boolean;
}

export default function VacancyCard({ vacancy, premium = false }: VacancyCardProps) {
  const isPremium = premium || vacancy.vacancy_type === 'premium';

  return (
    <Link
      to={`/vakansiya/${vacancy.id}`}
      className={cn(
        'card p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:border-primary-300 group block',
        isPremium && 'ring-2 ring-accent-200 bg-gradient-to-br from-white to-accent-50/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isPremium && (
              <span className="badge bg-accent-100 text-accent-700">
                <Star className="w-3 h-3 fill-accent-500" /> Premium
              </span>
            )}
            <span className="badge bg-primary-50 text-primary-700">
              {vacancy.employment_type}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1">
            {vacancy.title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-600">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate">{vacancy.company?.company_name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            {vacancy.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {vacancy.city.name_az}{vacancy.subregion ? `, ${vacancy.subregion}` : ''}
              </span>
            )}
            {vacancy.category && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {vacancy.category.name_az}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(vacancy.published_at || vacancy.created_at)}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-gray-900">
            {formatSalary(vacancy.salary_min, vacancy.salary_max, vacancy.salary_visible, vacancy.salary_currency)}
          </div>
          {vacancy.views_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1 justify-end">
              <Eye className="w-3 h-3" />
              {vacancy.views_count}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
