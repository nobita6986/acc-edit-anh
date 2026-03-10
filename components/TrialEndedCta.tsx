
import React from 'react';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

interface TrialEndedCtaProps {
  onLoginClick: () => void;
  onPricingClick: () => void;
}

const TrialEndedCta: React.FC<TrialEndedCtaProps> = ({ onLoginClick, onPricingClick }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-t from-[#3a2d0f] to-[#5a461c] border border-yellow-500 text-yellow-100 px-4 py-3 rounded-lg relative mb-6 text-center shadow-lg shadow-yellow-900/50" role="alert">
      <div className="flex flex-col items-center justify-center gap-2">
        <div>
          <strong className="font-bold text-lg">{t('trialEnded.title')}</strong>
          <span className="block sm:inline ml-2">{t('trialEnded.description')}</span>
        </div>
        <div className="flex items-center space-x-3 mt-2">
           <button
                onClick={onPricingClick}
                className="bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white font-bold px-4 py-2 rounded-lg text-sm hover:from-pink-600 hover:to-fuchsia-600 transition-all duration-300 shadow-lg hover:shadow-pink-500/40"
            >
                {t('header.pricing')}
            </button>
            <button
                onClick={onLoginClick}
                className="bg-yellow-500 text-black font-bold py-2 px-5 rounded-lg hover:bg-yellow-400 transition-colors text-sm shadow-md"
            >
                {t('trialEnded.loginButton')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default TrialEndedCta;
