
import React from 'react';
import { SparklesIcon } from '../components/Icons';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

interface PlaceholderProps {
  title: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-96">
      <div className="text-center p-10 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg">
        <SparklesIcon className="w-16 h-16 text-yellow-400 mx-auto mb-5" />
        <h1 className="text-4xl font-bold text-cyan-400 mb-4">{title}</h1>
        <p className="text-slate-300 text-lg mb-6">
          {t('placeholder.upgradeDescription')}
        </p>
        <p className="text-slate-400 mb-4">
          {t('placeholder.contactSupport')}
        </p>
        <a 
          href="https://zalo.me/0913275768" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block bg-sky-600 text-white font-bold text-2xl py-3 px-8 rounded-lg transition-transform hover:scale-105 shadow-lg hover:shadow-sky-500/40"
        >
          {t('placeholder.contactButton')}
        </a>
      </div>
    </div>
  );
};

export default Placeholder;
