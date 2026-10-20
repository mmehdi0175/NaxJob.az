import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/lib/i18n/context';
import Homepage from '@/pages/Homepage';
import VacancyList from '@/pages/VacancyList';
import VacancyDetail from '@/pages/VacancyDetail';
import Companies from '@/pages/Companies';
import CompanyProfile from '@/pages/CompanyProfile';
import Pricing from '@/pages/Pricing';
import CVPage from '@/pages/CVPage';
import Login from '@/pages/auth/Login';
import RegisterChoice from '@/pages/auth/RegisterChoice';
import EmployerRegister from '@/pages/auth/EmployerRegister';
import CandidateRegister from '@/pages/auth/CandidateRegister';
import EmployerDashboard from '@/pages/employer/EmployerDashboard';
import Overview from '@/pages/employer/Overview';
import MyVacancies from '@/pages/employer/MyVacancies';
import CreateVacancy from '@/pages/employer/CreateVacancy';
import PaymentPage from '@/pages/employer/PaymentPage';
import Payments from '@/pages/employer/Payments';
import EditRequests from '@/pages/employer/EditRequests';
import CompanyProfileSettings from '@/pages/employer/CompanyProfileSettings';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminVacancies from '@/pages/admin/AdminVacancies';
import AdminCompanies from '@/pages/admin/AdminCompanies';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminEditRequests from '@/pages/admin/AdminEditRequests';
import AdminSettings from '@/pages/admin/AdminSettings';
import CandidateDashboard from '@/pages/candidate/CandidateDashboard';
import CandidateOverview from '@/pages/candidate/CandidateOverview';
import MyCVs from '@/pages/candidate/MyCVs';
import CreateCVWizard from '@/pages/candidate/CreateCVWizard';
import CVDetail from '@/pages/candidate/CVDetail';
import CandidateProfile from '@/pages/candidate/CandidateProfile';

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
      <BrowserRouter>
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
          <Route path="/namized/dashboard" element={<CandidateDashboard />}>
            <Route index element={<CandidateOverview />} />
            <Route path="cv-lerim" element={<MyCVs />} />
            <Route path="cv-lerim/:cvId" element={<CVDetail />} />
            <Route path="yeni-cv" element={<CreateCVWizard />} />
            <Route path="yeni-cv/:cvId" element={<CreateCVWizard />} />
            <Route path="profil" element={<CandidateProfile />} />
          </Route>

          {/* Employer dashboard */}
          <Route path="/employer/dashboard" element={<EmployerDashboard />}>
            <Route index element={<Overview />} />
            <Route path="vakansiyalar" element={<MyVacancies />} />
            <Route path="yeni-vakansiya" element={<CreateVacancy />} />
            <Route path="odenis/:vacancyId" element={<PaymentPage />} />
            <Route path="odenisler" element={<Payments />} />
            <Route path="sorular" element={<EditRequests />} />
            <Route path="profil" element={<CompanyProfileSettings />} />
          </Route>

          {/* Admin panel */}
          <Route path="/admin" element={<AdminLayout />}>
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
      </BrowserRouter>
      </I18nProvider>
    </AuthProvider>
  );
}
