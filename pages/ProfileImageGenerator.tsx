
import React, { useState, useRef, useEffect } from 'react';
import { generateMultipleImageEdits } from '../services/geminiService';
import { CameraIcon, LoaderIcon, SparklesIcon, EyeIcon, AspectRatioSquareIcon, CheckIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { AspectRatio } from '../services/geminiService';
import ProgressBar from '../components/ProgressBar';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

interface ProfileImageGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
}

// --- Style Library ---
type CreativeStyle = {
  id: string;
  name: string;
  prompt: string;
  imageUrl: string;
};

const styles: CreativeStyle[] = [
  {
    id: 'professional',
    name: 'Doanh nhân',
    prompt: 'Transform the person into a professional corporate headshot. They should be wearing a modern business suit. The background should be a softly blurred office environment. Use studio lighting for a sharp, clean look. Preserve their facial features.',
    imageUrl: 'https://placehold.co/300x300/3b82f6/ffffff?text=Doanh+nhân',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    prompt: 'Convert the person into a cyberpunk character. Give them subtle glowing cybernetic implants and futuristic clothing. Place them in a neon-lit, rainy, futuristic city street at night. Use dramatic, cinematic lighting with vibrant blues and purples. Preserve their facial features.',
    imageUrl: 'https://placehold.co/300x300/ec4899/ffffff?text=Cyberpunk',
  },
  {
    id: 'anime',
    name: 'Anime',
    prompt: 'Redraw the person in a vibrant, high-quality anime art style, similar to a modern fantasy anime movie. Give them an adventurous expression. The background should be a beautiful, scenic anime landscape. Preserve their core facial features.',
    imageUrl: 'https://placehold.co/300x300/f97316/ffffff?text=Anime',
  },
  {
    id: 'tet',
    name: 'Avatar Tết',
    prompt: 'Re-imagine the person celebrating the Vietnamese New Year (Tết). They should be wearing a beautiful, elegant traditional Ao Dai. The background should be festive, filled with peach blossoms (hoa đào) and red lucky money envelopes. The lighting should be warm and joyful. Preserve their facial features.',
    imageUrl: 'https://placehold.co/300x300/ef4444/ffffff?text=Tết',
  },
   {
    id: 'artist',
    name: 'Họa sĩ',
    prompt: 'Recreate the person as if they were painted by a master artist. Use visible, expressive brushstrokes and a rich color palette. The background should be an abstract, textured canvas. Preserve their core facial features within the artistic style.',
    imageUrl: 'https://placehold.co/300x300/8b5cf6/ffffff?text=Họa+sĩ',
  },
  {
    id: 'fantasy',
    name: 'Giả tưởng',
    prompt: 'Depict the person as a fantasy hero, like an elf or a warrior. They should have fantasy-style armor or robes. The background is an enchanted forest or ancient ruins. The lighting is magical and epic. Preserve their facial features.',
    imageUrl: 'https://placehold.co/300x300/22c55e/ffffff?text=Fantasy',
  },
  {
    id: 'vintage',
    name: 'Cổ điển',
    prompt: 'Create a vintage, black and white photograph of the person from the 1940s. They should be dressed in period-appropriate clothing. The background should be a classic studio setting. Use dramatic, film noir lighting. Preserve their facial features.',
    imageUrl: 'https://placehold.co/300x300/6b7280/ffffff?text=Vintage',
  },
  {
    id: 'astronaut',
    name: 'Phi hành gia',
    prompt: 'Place the person in a realistic astronaut suit, with the helmet visor reflecting a nebula or a planet. The background is the vastness of outer space. Use cosmic lighting. Preserve their facial features inside the helmet.',
    imageUrl: 'https://placehold.co/300x300/6366f1/ffffff?text=Astronaut',
  }
];

const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '1:1', label: 'Vuông', icon: AspectRatioSquareIcon },
];

const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
        case '16:9': return 'aspect-[16/9]';
        case '9:16': return 'aspect-[9/16]';
        case '1:1': default: return 'aspect-square';
    }
};

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      resolve({ base64: data, mimeType });
    };
    reader.onerror = error => reject(error);
  });
};

const LOCAL_STORAGE_KEY = 'tlab-ProfileImageGenerator-state';
const GENERATION_COST = 2; // Generating multiple images is expensive

const ProfileImageGenerator: React.FC<ProfileImageGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing, onOpenPreview }) => {
  const { t } = useLanguage();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1'); // Default to square for profiles
  
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trialEnded = isTrial && trialCreations < GENERATION_COST;

  useEffect(() => {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
        try {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.selectedStyleId) setSelectedStyleId(savedState.selectedStyleId);
            if (savedState.additionalPrompt) setAdditionalPrompt(savedState.additionalPrompt);
        } catch(e) { 
            console.error('Failed to parse ProfileImageGenerator state', e);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    }
  }, []);

  useEffect(() => {
    const stateToSave = { selectedStyleId, additionalPrompt };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [selectedStyleId, additionalPrompt]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setGeneratedImages([]);
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => setOriginalImage(reader.result as string);
    }
  };

  const triggerFileSelect = () => {
    if (trialEnded) return;
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    const selectedStyle = styles.find(s => s.id === selectedStyleId);
    if (!selectedStyle) {
        setError(t('profileImage.errorStyle'));
        return;
    }
    if (!file) {
      setError(t('profileImage.errorImage'));
      return;
    }
    if (trialEnded) {
      setError(t('profileImage.errorTrial', { cost: GENERATION_COST }));
      return;
    }

    if (isTrial) onTrialGenerate(GENERATION_COST);

    setLoading(true);
    setError(null);
    setGeneratedImages([]);
    setProgress(0);
    setStatusText(t('profileImage.statusPrepare'));
    
    try {
      let finalPrompt = selectedStyle.prompt;
      if (additionalPrompt.trim()) {
          finalPrompt += `. Also incorporate the following details: ${additionalPrompt.trim()}.`;
      }

      setProgress(20);
      setStatusText(t('profileImage.statusProcess'));
      const { base64, mimeType } = await fileToBase64(file);

      setProgress(50);
      setStatusText(t('profileImage.statusApplyStyle', { style: selectedStyle.name }));

      const resultUrls = await generateMultipleImageEdits(base64, mimeType, finalPrompt, 2);
      
      setProgress(90);
      setStatusText(t('profileImage.statusFinalize'));
      setGeneratedImages(resultUrls);

      setProgress(100);
      setStatusText(t('profileImage.statusSuccess'));
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || t('profileImage.errorGeneral'));
      console.error(err);
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const styleName = styles.find(s => s.id === selectedStyleId)?.name || 'profile';
    link.download = `t-lab_profile_${styleName.toLowerCase().replace(/\s+/g, '_')}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  const canGenerate = originalImage && selectedStyleId;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 mb-2">
          {t('profileImage.title')}
        </h1>
        <p className="text-lg text-slate-400">
          {t('profileImage.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col">
          {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
          
          <div className="flex-grow flex flex-col gap-6">
              {/* Step 1: Upload */}
              <div>
                <h2 className="text-xl font-bold text-pink-400 mb-3"><span className="bg-pink-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">1</span> {t('profileImage.uploadLabel')}</h2>
                <div
                  onClick={triggerFileSelect}
                  className={`w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${trialEnded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-pink-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={trialEnded} />
                  {originalImage ? (
                    <img src={originalImage} alt="Original" className="w-full h-full object-contain rounded-md p-2" />
                  ) : (
                    <><CameraIcon className="w-12 h-12 text-slate-400 mb-2" /><p className="text-slate-300">{t('profileImage.uploadButton')}</p></>
                  )}
                </div>
              </div>

              {/* Step 2: Select Style */}
              <div>
                <h2 className="text-xl font-bold text-pink-400 mb-3"><span className="bg-pink-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">2</span> {t('profileImage.styleLabel')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {styles.map((style) => (
                    <div
                      key={style.id}
                      onClick={() => !trialEnded && !loading && setSelectedStyleId(style.id)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all duration-200
                        ${selectedStyleId === style.id ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'border-slate-700'}
                        ${trialEnded || loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-pink-500 hover:scale-105'}`
                      }
                    >
                      <img src={style.imageUrl} alt={style.name} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <p className="absolute bottom-2 left-2 text-white font-bold text-sm">{style.name}</p>
                      {selectedStyleId === style.id && (
                        <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                 <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">{t('profileImage.detailsLabel')}</label>
                    <textarea
                        value={additionalPrompt}
                        onChange={(e) => setAdditionalPrompt(e.target.value)}
                        placeholder={t('profileImage.detailsPlaceholder')}
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none"
                        rows={2}
                        disabled={loading || trialEnded || !originalImage}
                    />
                </div>
              </div>
          </div>
          
          {/* Step 3: Generate */}
          <div className="mt-auto pt-6 border-t border-slate-700/50">
             <h2 className="text-xl font-bold text-pink-400 mb-3"><span className="bg-pink-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">3</span> {t('profileImage.generateLabel')}</h2>
             <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate || trialEnded}
              className="w-full flex items-center justify-center bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><LoaderIcon className="animate-spin mr-2" />{t('profileImage.generatingButton')}</> : <><SparklesIcon className="mr-2" />{t('profileImage.generateButton')}</>}
            </button>
          </div>
          {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>

        {/* Result */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-4 self-start">{t('common.results')}</h2>
            <div className="w-full flex-grow flex items-center justify-center">
                {loading && (
                    <div className="w-full">
                        <ProgressBar progress={progress} statusText={statusText} accentColor="purple" />
                    </div>
                )}
                {generatedImages.length > 0 && !loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        {generatedImages.map((image, index) => (
                            <div key={index} className="flex flex-col gap-2 bg-slate-800/40 p-2 rounded-xl">
                                <div className={`w-full bg-slate-900/50 rounded-lg overflow-hidden ${getAspectRatioClass(aspectRatio)}`}>
                                     <img src={image} alt={`Generated profile photo ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <button
                                    onClick={() => onOpenPreview(image, () => handleDownload(image, index))}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-3 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md text-sm"
                                >
                                    <EyeIcon className="w-4 h-4" /> {t('common.previewAndDownload')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {generatedImages.length === 0 && !loading && (
                  <div className={`w-full flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600 ${getAspectRatioClass(aspectRatio)}`}>
                    <p className="text-center p-4">{t('profileImage.resultsPlaceholder')}</p>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageGenerator;
