import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { Bus, LogIn, ShieldCheck, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthScreen: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(isRegistering);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-25%] left-[-15%] w-[700px] h-[700px] bg-sky-50/50 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[460px] z-10"
      >
        <div className="glass-card shadow-xl rounded-2xl p-10 flex flex-col border border-slate-200/80">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 bg-white rounded-sm rotate-45"></div>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight leading-none">
                SafarLink
              </h1>
              <p className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mt-1">
                Mobility Management
              </p>
            </div>
          </div>

          {/* Intro text */}
          <div className="mb-8">
            <h2 className="font-display font-semibold text-xl text-slate-800 tracking-tight">
              {isRegistering ? 'Create an account' : 'Sign in to your account'}
            </h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {isRegistering 
                ? 'Register to access the transport, dispatch, and parcel logistics center.'
                : 'Access the transport, dispatch, and parcel logistics center for Somaliland branches.'}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start space-x-2">
              <span className="font-medium">Error:</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder-slate-400"
                  placeholder="e.g. Ali Ahmed"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder-slate-400"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm tracking-wide flex items-center justify-center space-x-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer mt-2"
            >
              <span>{loading ? 'Processing...' : (isRegistering ? 'Register Account' : 'Sign In')}</span>
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Social login action */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm flex items-center justify-center space-x-3 transition-all shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            )}
            <span>
              {loading 
                ? (isRegistering ? 'Registering...' : 'Signing in...') 
                : (isRegistering ? 'Register with Google' : 'Sign in with Google')}
            </span>
          </button>

          {/* Toggle Register/Login */}
          <div className="mt-6 text-center text-sm font-medium text-slate-500">
            {isRegistering ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
                >
                  Register
                </button>
              </p>
            )}
          </div>

          {/* Footer security badge */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Google Secure Authentication</span>
            </div>
            <div className="flex items-center space-x-1 hover:text-slate-600 transition-colors cursor-pointer">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Need help?</span>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          &copy; {new Date().getFullYear()} SafarLink. Authorized transport personnel only.
        </p>
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-slate-400 select-none tracking-tight">
            made by <span className="font-semibold text-slate-500">Raazim tech</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
};
