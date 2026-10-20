import { Link } from 'react-router-dom';
import { Briefcase, Mail, Phone } from 'lucide-react';
import { BRAND } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white transition-colors group-hover:text-primary-200">{BRAND.name}</span>
            </Link>
            <p className="text-sm text-gray-400">{BRAND.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Keçidlər</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors duration-200">Əsas səhifə</Link></li>
              <li><Link to="/vakansiyalar" className="hover:text-white transition-colors duration-200">Vakansiyalar</Link></li>
              <li><Link to="/sirketler" className="hover:text-white transition-colors duration-200">Şirkətlər</Link></li>
              <li><Link to="/qiymetler" className="hover:text-white transition-colors duration-200">Qiymətlər</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">İşəgötürənlər</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/qeydiyyat" className="hover:text-white transition-colors duration-200">Qeydiyyat</Link></li>
              <li><Link to="/giris" className="hover:text-white transition-colors duration-200">Giriş</Link></li>
              <li><Link to="/employer/dashboard" className="hover:text-white transition-colors duration-200">İdarəetmə paneli</Link></li>
              <li><Link to="/qiymetler" className="hover:text-white transition-colors duration-200">Premium elanlar</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Əlaqə</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${BRAND.email}`} className="hover:text-white transition-colors duration-200">{BRAND.email}</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${BRAND.phone.replace(/\s/g, '')}`} className="hover:text-white transition-colors duration-200">{BRAND.phone}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} {BRAND.name}. Bütün hüquqlar qorunur.</p>
          <p>Azərbaycan Respublikasında qeydiyyatdan keçmiş.</p>
        </div>
      </div>
    </footer>
  );
}
