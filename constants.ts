export const NAXCIVAN_REGION_SLUGS = [
  'naxcivan',
  'babek-rayonu',
  'culfa-rayonu',
  'ordubad-rayonu',
  'sederek-rayonu',
  'sahbuz-rayonu',
  'serur-rayonu',
  'kengerli-rayonu',
] as const;

export const EMPLOYMENT_TYPES = [
  'Tam ştat',
  'Yarım ştat',
  'Sənədli',
  'Frilans',
  'Təcrübə',
  'Müqavilə',
] as const;

export const EDUCATION_LEVELS = [
  'Vacib deyil',
  'Orta',
  'Orta ixtisas',
  'Natamam ali',
  'Ali',
  'Elmi dərəcə',
] as const;

export const EMPLOYMENT_TYPE_SLUGS: Record<string, string> = {
  'Tam ştat': 'tam-stat',
  'Yarım ştat': 'yari-stat',
  Sənədli: 'senedli',
  Frilans: 'frilans',
  Təcrübə: 'tecrube',
  Müqavilə: 'muqavile',
};

export const VACANCY_STATUS_LABELS: Record<string, string> = {
  draft: 'Qaralama',
  pending_payment: 'Ödəniş gözləyir',
  active: 'Aktiv',
  expired: 'Müddəti bitib',
  rejected: 'Rədd edilib',
  suspended: 'Dayandırılıb',
  removed: 'Silinib',
};

export const VACANCY_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_payment: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
  removed: 'bg-red-100 text-red-700',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Gözləyir',
  confirmed: 'Təsdiqlənib',
  failed: 'Uğursuz',
  cancelled: 'Ləğv edilib',
  refunded: 'Geri qaytarılıb',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
  refunded: 'bg-blue-100 text-blue-700',
};

export const EDIT_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Gözləyir',
  approved: 'Təsdiqlənib',
  rejected: 'Rədd edilib',
  completed: 'Tamamlandı',
};

export const EDIT_REQUEST_TYPE_LABELS: Record<string, string> = {
  correction: 'Düzəliş',
  deletion: 'Silinmə',
  extension: 'Müddət uzadılması',
};

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  reviewing: 'Baxılır',
  interview: 'Müsahibəyə dəvət',
  rejected: 'Uyğun deyil',
  hired: 'İşə qəbul edilib',
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewing: 'bg-amber-100 text-amber-700',
  interview: 'bg-success-100 text-success-700',
  rejected: 'bg-red-100 text-red-700',
  hired: 'bg-primary-100 text-primary-700',
};

export const BRAND = {
  name: 'İşBaza',
  tagline: 'Azərbaycanın iş elanları platforması',
  email: 'info@isbaza.az',
  phone: '+994 12 555 00 00',
};

export const CV_EDUCATION_LEVEL_LABELS: Record<string, string> = {
  scientific_degree: 'Elmi dərəcə',
  higher: 'Ali',
  incomplete_higher: 'Natamam ali',
  secondary_technical: 'Orta texniki',
  secondary_special: 'Orta xüsusi',
  secondary: 'Orta',
  none: 'Yoxdur',
};

export const CV_EDUCATION_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'scientific_degree', label: 'Elmi dərəcə' },
  { value: 'higher', label: 'Ali' },
  { value: 'incomplete_higher', label: 'Natamam ali' },
  { value: 'secondary_technical', label: 'Orta texniki' },
  { value: 'secondary_special', label: 'Orta xüsusi' },
  { value: 'secondary', label: 'Orta' },
  { value: 'none', label: 'Yoxdur' },
];

export const CV_EXPERIENCE_DURATION_LABELS: Record<string, string> = {
  none: 'Təcrübəsiz',
  under_1: '1 ildən aşağı',
  '1_to_3': '1 ildən 3 ilə qədər',
  '3_to_5': '3 ildən 5 ilə qədər',
  over_5: '5 ildən artıq',
};

export const CV_EXPERIENCE_DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'under_1', label: '1 ildən aşağı' },
  { value: '1_to_3', label: '1 ildən 3 ilə qədər' },
  { value: '3_to_5', label: '3 ildən 5 ilə qədər' },
  { value: 'over_5', label: '5 ildən artıq' },
  { value: 'none', label: 'Təcrübəsiz' },
];

export const CV_GENDER_LABELS: Record<string, string> = {
  male: 'Kişi',
  female: 'Qadın',
};
