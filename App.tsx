



import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
//- Fix: Corrected import path
import { LanguageProvider, useLanguage } from './i18n';
import { LoaderIcon } from './components/Icons';

// Lazy load page components for code splitting
const TextToImageGenerator = lazy(() => import('./pages/TextToImageGenerator'));
const ImageEditor = lazy(() => import('./pages/ImageEditor'));
const Placeholder = lazy(() => import('./pages/Placeholder'));
const PromptFromImageGenerator = lazy(() => import('./pages/PromptFromImageGenerator'));
const AdCreativeGenerator = lazy(() => import('./pages/AdCreativeGenerator'));
const ProfileImageGenerator = lazy(() => import('./pages/ProfileImageGenerator'));
const OnlineTravelGenerator = lazy(() => import('./pages/OnlineTravelGenerator'));
//- Fix: Corrected import path
const ProductPhotoshootGenerator = lazy(() => import('./pages/ProductPhotoshootGenerator'));
const FashionStudioGenerator = lazy(() => import('./pages/FashionStudioGenerator'));
const TextToSpeechGenerator = lazy(() => import('./pages/TextToSpeechGenerator'));
// Fix: Import ImagePreviewModal to resolve 'Cannot find name' error.
const ImagePreviewModal = lazy(() => import('./components/ImagePreviewModal'));


// Using language-independent keys for pages
export type Page = 
  | 'fashionStudio'
  | 'adCreative'
  | 'productPhotoshoot'
  | 'onlineTravel'
  | 'profileImage'
  | 'textToImage'
  | 'imageEditor'
  | 'promptFromImage'
  | 'textToSpeech';

export type ImageToEdit = {
  url: string;
  file: File;
};

const validPages: Page[] = [
  'fashionStudio',
  'adCreative',
  'productPhotoshoot',
  'onlineTravel',
  'textToImage',
  'imageEditor',
  'promptFromImage',
  'profileImage',
  'textToSpeech',
];


type PreviewState = {
  url: string;
  onDownload: () => void;
} | null;

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  
  const [activePage, setActivePage] = useState<Page>(() => {
    const savedPage = localStorage.getItem('tlab-activePage');
    if (savedPage && (validPages as string[]).includes(savedPage)) {
      return savedPage as Page;
    }
    return 'fashionStudio'; // Default page
  });

  const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewState>(null);
  
  useEffect(() => {
    localStorage.setItem('tlab-activePage', activePage);
  }, [activePage]);

  const handleOpenPreview = (url: string, onDownload: () => void) => setPreviewImage({ url, onDownload });
  const handleClosePreview = () => setPreviewImage(null);

  const handleEditImage = (image: ImageToEdit) => {
    setImageToEdit(image);
    setActivePage('imageEditor');
  };

  const renderPage = () => {
    // No more trial system, provide unlimited access.
    const unlimitedProps = {
      isTrial: false,
      trialCreations: Infinity, // Effectively unlimited
      onTrialGenerate: () => {}, // No-op
      onRequireLogin: () => {}, // No-op
      onRequirePricing: () => {}, // No-op
    };

    switch (activePage) {
      case 'fashionStudio':
        return <FashionStudioGenerator {...unlimitedProps} onOpenPreview={handleOpenPreview} />;
      case 'textToImage':
        return <TextToImageGenerator onEditImage={handleEditImage} onOpenPreview={handleOpenPreview} {...unlimitedProps} />;
      case 'imageEditor':
        return <ImageEditor initialImage={imageToEdit} onEditComplete={() => setImageToEdit(null)} onOpenPreview={handleOpenPreview} {...unlimitedProps} />;
      case 'adCreative':
        return <AdCreativeGenerator onEditImage={handleEditImage} onOpenPreview={handleOpenPreview} {...unlimitedProps} />;
       case 'productPhotoshoot':
        return <ProductPhotoshootGenerator onOpenPreview={handleOpenPreview} {...unlimitedProps} />;
      case 'promptFromImage':
        return <PromptFromImageGenerator {...unlimitedProps} />;
      case 'textToSpeech':
        return <TextToSpeechGenerator {...unlimitedProps} />;
      case 'onlineTravel':
        return <OnlineTravelGenerator {...unlimitedProps} />;
      case 'profileImage':
        return <ProfileImageGenerator onOpenPreview={handleOpenPreview} {...unlimitedProps} />;
      default:
        return <FashionStudioGenerator {...unlimitedProps} onOpenPreview={handleOpenPreview} />; 
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4,
  };
  
  const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96">
      <LoaderIcon className="w-12 h-12 animate-spin text-sky-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02042b] via-[#0A1F44] to-[#1d143d] text-gray-200">
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SuspenseFallback />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {/* Fix: Wrap lazy-loaded ImagePreviewModal in a Suspense component. */}
      <Suspense fallback={<></>}>
        {previewImage && <ImagePreviewModal isOpen={!!previewImage} onClose={handleClosePreview} imageUrl={previewImage.url} onDownload={previewImage.onDownload} />}
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;