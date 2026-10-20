import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) return setError('Email və şifrə daxil edin.');

    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError('Email və ya şifrə yanlışdır.');
      setLoading(false);
      return;
    }

    const role: UserRole = (data.user?.app_metadata?.user_role as UserRole) || 'employer';
    if (role === 'admin') navigate('/admin');
    else if (role === 'candidate') navigate('/namized/dashboard');
    else navigate('/employer/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-primary-700">İşBaza</span>
        </Link>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Giriş</h1>
          <p className="text-sm text-gray-500 mb-6">Hesabınıza daxil olun</p>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-slide-down">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="name@company.az"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifrə</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Daxil olunur...' : 'Daxil ol'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            Hesabınız yoxdur? <Link to="/qeydiyyat" className="text-primary-600 hover:text-primary-700 font-medium">Qeydiyyatdan keçin</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
