import { Link } from 'react-router-dom';
import { Briefcase, UserCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function RegisterChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-700">İşBaza</span>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Qeydiyyat növünü seçin</h1>
          <p className="text-gray-500">Hansı kimi qeydiyyatdan keçmək istəyirsiniz?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/qeydiyyat/isegoturen"
            className="card p-6 hover:shadow-lg hover:border-primary-300 transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 group-hover:bg-primary-100 transition-colors">
              <Briefcase className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">İşəgötürən</h2>
            <p className="text-sm text-gray-500 mb-4">
              Şirkətinizi qeydiyyatdan keçirin, vakansiya yerləşdirin və namizədlərə çatın.
            </p>
            <ul className="space-y-1.5 mb-4">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-success-600" /> Vakansiya elanları
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-success-600" /> Hər ay 2 pulsuz elan
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-success-600" /> Namizədləri axtarın
              </li>
            </ul>
            <span className="flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:text-primary-700">
              Qeydiyyatdan keç <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            to="/qeydiyyat/namized"
            className="card p-6 hover:shadow-lg hover:border-success-300 transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-success-50 text-success-600 flex items-center justify-center mb-4 group-hover:bg-success-100 transition-colors">
              <UserCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">İş axtaran</h2>
            <p className="text-sm text-gray-500 mb-4">
              CV yaradın, vakansiyalara müraciət edin və işəgötürənlər tərəfindən tapılın.
            </p>
            <ul className="space-y-1.5 mb-4">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-success-600" /> CV yaradın və yükləyin
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-success-600" /> Vakansiyalara müraciət
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-success-600" /> İşəgötürənlərə görün
              </li>
            </ul>
            <span className="flex items-center gap-1 text-sm font-medium text-success-600 group-hover:text-success-700">
              Qeydiyyatdan keç <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          Hesabınız var? <Link to="/giris" className="text-primary-600 hover:text-primary-700 font-medium">Daxil olun</Link>
        </p>
      </div>
    </div>
  );
}
