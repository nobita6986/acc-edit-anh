



import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Page } from '../App';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

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

  return (
    <header className="bg-[#0A1F44]/80 backdrop-blur-sm sticky top-0 z-50 shadow-lg shadow-black/20 border-b border-slate-700/50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top section: Title and User info */}
        <div className="flex items-center justify-between min-h-[4rem]">
          <div className="flex-shrink-0">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-baseline">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-fuchsia-500">
                NC
              </span>
              <span className="text-sm md:text-base font-semibold text-slate-300 ml-3 hidden sm:inline">
                - {t('header.tagline')}
              </span>
            </h1>
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
    </header>
  );
};

export default Header;