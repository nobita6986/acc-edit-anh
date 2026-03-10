



import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Page } from '../App';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';
import ApiSettingsModal from './ApiSettingsModal';

interface HeaderProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const navItems: Page[] = [
  'fashionStudio',
  'adCreative',
  'productPhotoshoot',
  'onlineTravel',
  'profileImage',
  'textToImage',
  'imageEditor',
  'promptFromImage',
  'textToSpeech',
];

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage }) => {
  const { t } = useLanguage();
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  return (
    <header className="bg-[#0A1F44]/80 backdrop-blur-sm sticky top-0 z-50 shadow-lg shadow-black/20 border-b border-slate-700/50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top section: Title and User info */}
        <div className="flex items-center justify-between min-h-[4rem]">
          <div className="flex-shrink-0">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-baseline">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-fuchsia-500">
                StudyAI86
              </span>
              <span className="text-sm md:text-base font-semibold text-slate-300 ml-3 hidden sm:inline">
                - {t('header.tagline')}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsApiModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-lg transition-colors font-medium text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              API & Model
            </button>
          </div>
        </div>
        
        {/* Bottom section: Navigation */}
        <div className="mt-2">
          <nav className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-2">
            <div className="flex flex-wrap justify-center items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item}
                  onClick={() => setActivePage(item)}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ease-in-out
                    ${activePage === item 
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                >
                  {t(`nav.${item}`)}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
      
      <AnimatePresence>
        {isApiModalOpen && (
          <ApiSettingsModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;