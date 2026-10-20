import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/lib/i18n/context';
import Homepage from '@/pages/Homepage';
import { Spinner } from '@/components/Spinner';

const VacancyList = lazy(() => import('@/pages/VacancyList'));
const VacancyDetail = lazy(() => import('@/pages/VacancyDetail'));
const Companies = lazy(() => import('@/pages/Companies'));
const CompanyProfile = lazy(() => import('@/pages/CompanyProfile'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const CVPage = lazy(() => import('@/pages/CVPage'));
const Login = lazy(() => import('@/pages/auth/Login'));
const RegisterChoice = lazy(() => import('@/pages/auth/RegisterChoice'));
const EmployerRegister = lazy(() => import('@/pages/auth/EmployerRegister'));
const CandidateRegister = lazy(() => import('@/pages/auth/CandidateRegister'));
const EmployerDashboard = lazy(() => import('@/pages/employer/EmployerDashboard'));
const Overview = lazy(() => import('@/pages/employer/Overview'));
const MyVacancies = lazy(() => import('@/pages/employer/MyVacancies'));
const CreateVacancy = lazy(() => import('@/pages/employer/CreateVacancy'));
const PaymentPage = lazy(() => import('@/pages/employer/PaymentPage'));
const Payments = lazy(() => import('@/pages/employer/Payments'));
const EditRequests = lazy(() => import('@/pages/employer/EditRequests'));
const CompanyProfileSettings = lazy(() => import('@/pages/employer/CompanyProfileSettings'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminVacancies = lazy(() => import('@/pages/admin/AdminVacancies'));
const AdminCompanies = lazy(() => import('@/pages/admin/AdminCompanies'));
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments'));
const AdminEditRequests = lazy(() => import('@/pages/admin/AdminEditRequests'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const CandidateDashboard = lazy(() => import('@/pages/candidate/CandidateDashboard'));
const CandidateOverview = lazy(() => import('@/pages/candidate/CandidateOverview'));
const MyCVs = lazy(() => import('@/pages/candidate/MyCVs'));
const CreateCVWizard = lazy(() => import('@/pages/candidate/CreateCVWizard'));
const CVDetail = lazy(() => import('@/pages/candidate/CVDetail'));
const CandidateProfile = lazy(() => import('@/pages/candidate/CandidateProfile'));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute'));

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-16">
      <Spinner />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Homepage />} />
              <Route path="/vakansiyalar" element={<VacancyList />} />
              <Route path="/vakansiya/:id" element={<VacancyDetail />} />
              <Route path="/sirketler" element={<Companies />} />
              <Route path="/sirket/:id" element={<CompanyProfile />} />
              <Route path="/qiymetler" element={<Pricing />} />
              <Route path="/cv-ler" element={<CVPage />} />

              {/* Auth routes */}
              <Route path="/giris" element={<Login />} />
              <Route path="/qeydiyyat" element={<RegisterChoice />} />
              <Route path="/qeydiyyat/isegoturen" element={<EmployerRegister />} />
              <Route path="/qeydiyyat/namized" element={<CandidateRegister />} />

              {/* Candidate dashboard */}
              <Route path="/namized/dashboard" element={<ProtectedRoute role="candidate"><CandidateDashboard /></ProtectedRoute>}>
                <Route index element={<CandidateOverview />} />
                <Route path="cv-lerim" element={<MyCVs />} />
                <Route path="cv-lerim/:cvId" element={<CVDetail />} />
                <Route path="yeni-cv" element={<CreateCVWizard />} />
                <Route path="yeni-cv/:cvId" element={<CreateCVWizard />} />
                <Route path="profil" element={<CandidateProfile />} />
              </Route>

              {/* Employer dashboard */}
              <Route path="/employer/dashboard" element={<ProtectedRoute role="employer"><EmployerDashboard /></ProtectedRoute>}>
                <Route index element={<Overview />} />
                <Route path="vakansiyalar" element={<MyVacancies />} />
                <Route path="yeni-vakansiya" element={<CreateVacancy />} />
                <Route path="odenis/:vacancyId" element={<PaymentPage />} />
                <Route path="odenisler" element={<Payments />} />
                <Route path="sorular" element={<EditRequests />} />
                <Route path="profil" element={<CompanyProfileSettings />} />
              </Route>

              {/* Admin panel */}
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="vakansiyalar" element={<AdminVacancies />} />
                <Route path="sirketler" element={<AdminCompanies />} />
                <Route path="odenisler" element={<AdminPayments />} />
                <Route path="sorular" element={<AdminEditRequests />} />
                <Route path="ayarlar" element={<AdminSettings />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Homepage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </I18nProvider>
    </AuthProvider>
  );
}
