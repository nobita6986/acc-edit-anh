
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as authService from '../services/authService';
import type { User } from '../services/authService';
import { CloseIcon } from '../components/Icons';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

interface LoginProps {
  onLogin: (user: User) => void;
  onClose: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onClose }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const loggedInUser = await authService.login(username, password);
      onLogin(loggedInUser);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const ZaloLink = () => (
    <a href="https://zalo.me/0913275768" target="_blank" rel="noopener noreferrer" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">0913275768</a>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02042b] via-[#0A1F44] to-[#1d143d] text-gray-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors z-10"
            aria-label={t('login.close')}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-fuchsia-500">
              StudyAI86
            </h1>
            <p className="text-slate-400 mt-2">
              {t('login.title')}
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-6">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">{t('login.usernameLabel')}</label>
                    <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.usernamePlaceholder')} required autoComplete="username"
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"/>
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">{t('login.passwordLabel')}</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')} required autoComplete="current-password"
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"/>
                </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
            <div className="mt-8">
                <button type="submit" className="w-full flex items-center justify-center bg-gradient-to-r from-sky-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-sky-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-cyan-500/30">
                    {t('login.loginButton')}
                </button>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                <p className="text-sm text-slate-400">
                    {t('login.contactAdmin').split('{zalo}').map((text, index) => (
                      <React.Fragment key={index}>
                        {text}
                        {index === 0 && <ZaloLink />}
                      </React.Fragment>
                    ))}
                </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
