export type UserRole = 'employer' | 'candidate' | 'admin';

export type ApplicationStatus = 'new' | 'reviewing' | 'interview' | 'rejected' | 'hired';

export interface Candidate {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  patronymic: string;
  email: string;
  phone: string;
  profession: string | null;
  experience_years: number | null;
  city_id: string | null;
  cv_file_path: string | null;
  cv_visible: boolean;
  bio: string | null;
  skills: string | null;
  created_at: string;
  updated_at: string;
  city?: City;
}

export interface VacancyApplication {
  id: string;
  vacancy_id: string;
  candidate_id: string;
  user_id: string;
  cv_file_path: string;
  cover_letter: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  vacancy?: Vacancy;
  candidate?: Candidate;
}

export type VacancyType = 'standard' | 'premium';

export type VacancyStatus =
  | 'draft'
  | 'pending_payment'
  | 'active'
  | 'expired'
  | 'rejected'
  | 'suspended'
  | 'removed';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded';

export type EditRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type EditRequestType = 'correction' | 'deletion' | 'extension';

export interface Category {
  id: string;
  name_az: string;
  slug: string;
  icon_name: string;
  sort_order: number;
}

export interface City {
  id: string;
  name_az: string;
  slug: string;
  sort_order: number;
}

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  voen: string;
  contact_email: string;
  contact_phone: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  address: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vacancy {
  id: string;
  company_id: string;
  category_id: string | null;
  city_id: string | null;
  subregion: string | null;
  title: string;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_visible: boolean;
  employment_type: string;
  experience_min: number | null;
  education: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  vacancy_type: VacancyType;
  status: VacancyStatus;
  is_paid: boolean;
  is_free_quota: boolean;
  payment_id: string | null;
  published_at: string | null;
  expires_at: string | null;
  premium_activated_at: string | null;
  views_count: number;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
  category?: Category;
  city?: City;
}

export interface Payment {
  id: string;
  company_id: string;
  vacancy_id: string | null;
  amount: number;
  currency: string;
  vacancy_type: VacancyType;
  status: PaymentStatus;
  payment_provider: string;
  provider_transaction_id: string | null;
  idempotency_key: string;
  test_mode: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  confirmed_at: string | null;
}

export interface VacancyStatusHistory {
  id: string;
  vacancy_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_role: string;
  note: string | null;
  created_at: string;
}

export interface VacancyEditRequest {
  id: string;
  vacancy_id: string;
  company_id: string;
  requested_by: string;
  request_type: EditRequestType;
  requested_changes: string;
  status: EditRequestStatus;
  admin_response: string | null;
  handled_by: string | null;
  created_at: string;
  resolved_at: string | null;
  vacancy?: Vacancy;
}

export interface AdminSettings {
  id: string;
  standard_vacancy_price: number;
  premium_vacancy_price: number;
  vacancy_duration_days: number;
  free_quota_per_month: number;
  payment_test_mode: boolean;
  payment_provider: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type EducationLevel =
  | 'scientific_degree'
  | 'higher'
  | 'incomplete_higher'
  | 'secondary_technical'
  | 'secondary_special'
  | 'secondary'
  | 'none';

export type ExperienceDuration = 'none' | 'under_1' | '1_to_3' | '3_to_5' | 'over_5';

export type Gender = 'male' | 'female';

export interface CandidateCV {
  id: string;
  user_id: string;
  title: string;
  profession: string | null;
  min_salary: number | null;
  specialty: string | null;
  first_name: string | null;
  last_name: string | null;
  patronymic: string | null;
  birth_date: string | null;
  gender: Gender | null;
  city_id: string | null;
  photo_path: string | null;
  education_level: EducationLevel | null;
  education_details: string | null;
  experience_duration: ExperienceDuration | null;
  experience_details: string | null;
  about: string | null;
  skills: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  city?: City;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  company: Company | null;
  candidate: Candidate | null;
}
