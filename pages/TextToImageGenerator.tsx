
import React, { useState, useEffect, useMemo } from 'react';
import { generateImageFromText, generatePromptFromImage, AspectRatio, BilingualPrompt } from '../services/geminiService';
import { LoaderIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, DownloadIcon, EditIcon, MagicWandIcon, CopyIcon, SparklesIcon, EyeIcon, DiceIcon } from '../components/Icons';
import type { ImageToEdit } from '../App';
import TrialEndedCta from '../components/TrialEndedCta';
import ProgressBar from '../components/ProgressBar';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

interface TextToImageGeneratorProps {
  onEditImage: (image: ImageToEdit) => void;
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
}

const TextToImageGenerator: React.FC<TextToImageGeneratorProps> = ({ onEditImage, isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing, onOpenPreview }) => {
  const { t } = useLanguage();

  const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
    { value: '1:1', label: t('common.square'), icon: AspectRatioSquareIcon },
    { value: '16:9', label: t('common.wide'), icon: AspectRatioWideIcon },
    { value: '9:16', label: t('common.tall'), icon: AspectRatioTallIcon },
  ];

  const generationPrompts = [
    'Một con cáo mặc áo khoác điệp viên, trong một con hẻm tối ở Paris',
    'Ảnh chụp một chậu cây xương rồng dễ thương đội mũ len nhỏ',
    'Tranh sơn dầu về một thư viện ấm cúng trên trạm vũ trụ',
    'Logo cho một quán cà phê tên là "The Starship Brew"',
    'Một con rồng pha lê đang ngủ trên một kho báu bằng vàng',
  ];
  
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<File[]>([]);
  const [generatedPrompts, setGeneratedPrompts] = useState<{ [key: number]: BilingualPrompt | null }>({});
  const [generatingPrompts, setGeneratingPrompts] = useState<{ [key: number]: boolean }>({});
  const [copiedPrompts, setCopiedPrompts] = useState<{ [key: number]: boolean }>({});
  
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');

  const shuffle = (array: string[]) => [...array].sort(() => Math.random() - 0.5);
  const initialPrompts = useMemo(() => shuffle(generationPrompts), []);
  const [shuffledPrompts, setShuffledPrompts] = useState(initialPrompts);
  const handleShuffle = () => setShuffledPrompts(shuffle(generationPrompts));

  const trialEnded = isTrial && trialCreations < 2;

  useEffect(() => {
    const savedStateJSON = localStorage.getItem('tlab-TextToImageGenerator-state');
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.prompt) setPrompt(savedState.prompt);
        if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
      } catch (e) {
        console.error("Failed to parse TextToImageGenerator state from localStorage", e);
        localStorage.removeItem('tlab-TextToImageGenerator-state');
      }
    }
  }, []);

  useEffect(() => {
    const stateToSave = { prompt, aspectRatio };
    localStorage.setItem('tlab-TextToImageGenerator-state', JSON.stringify(stateToSave));
  }, [prompt, aspectRatio]);

  const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
      case '16:9': return 'aspect-[16/9]';
      case '9:16': return 'aspect-[9/16]';
      case '1:1':
      default:
        return 'aspect-square';
    }
  };
  
  async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  }

  const handleGenerate = async () => {
    if (trialEnded) {
        setError(`Bạn cần ít nhất 2 lượt tạo miễn phí. Vui lòng đăng nhập để tiếp tục.`);
        return;
    }
    if (!prompt.trim()) {
      setError('Vui lòng nhập mô tả để tạo ảnh.');
      return;
    }

    if (isTrial) onTrialGenerate(2);

    setLoading(true);
    setError(null);
    setImageUrls([]);
    setGeneratedFiles([]);
    setGeneratedPrompts({});
    setGeneratingPrompts({});
    setCopiedPrompts({});
    setProgress(0);
    setStatusText('Bắt đầu quá trình tạo ảnh...');

    try {
      setProgress(25);
      setStatusText('AI đang chuẩn bị cọ vẽ...');
      
      const urls = await generateImageFromText(prompt, aspectRatio, 2);
      
      setProgress(75);
      setStatusText('Đang hoàn thiện các chi tiết cuối cùng...');

      setImageUrls(urls);
      const files = await Promise.all(
        urls.map((url, index) => dataUrlToFile(url, `t-lab_${index + 1}.png`))
      );
      setGeneratedFiles(files);
      
      setProgress(100);
      setStatusText('Tạo ảnh thành công!');
      
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tạo ảnh. Vui lòng thử lại.');
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    const safePrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 30).trim().replace(/\s+/g, '_');
    link.download = `t-lab_${safePrompt || 'generated_image'}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (index: number) => {
    if (imageUrls[index] && generatedFiles[index]) {
      onEditImage({ url: imageUrls[index], file: generatedFiles[index] });
    }
  };

  const handleGeneratePrompt = async (imageUrl: string, index: number) => {
    if (!imageUrl) return;
    setGeneratingPrompts(prev => ({ ...prev, [index]: true }));
    setGeneratedPrompts(prev => ({ ...prev, [index]: null }));
    setError(null);
    try {
      const [header, data] = imageUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      const promptObject = await generatePromptFromImage(data, mimeType);
      setGeneratedPrompts(prev => ({ ...prev, [index]: promptObject }));
    } catch (err: any) {
       setError(err.message || `Không thể tạo prompt cho ảnh ${index + 1}.`);
    } finally {
        setGeneratingPrompts(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleCopyPrompt = (promptObject: BilingualPrompt, index: number) => {
    navigator.clipboard.writeText(promptObject.en);
    setCopiedPrompts(prev => ({ ...prev, [index]: true }));
    setTimeout(() => setCopiedPrompts(prev => ({...prev, [index]: false})), 2000);
  };

  return (
    <div className="flex flex-col items-center">
        <div className="w-full max-w-4xl text-center mb-10">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-500 mb-2">
                {t('textToImage.title')}
            </h1>
            <p className="text-lg text-slate-400">
                {t('textToImage.description')}
            </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
            
            <div className="flex flex-col gap-4 flex-grow">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('textToImage.placeholder')}
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 resize-none"
                    rows={3}
                    disabled={loading || trialEnded}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('common.ratio')}</label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {aspectRatios.map((ratio) => {
                            const Icon = ratio.icon;
                            return (
                                <button
                                    key={ratio.value}
                                    onClick={() => setAspectRatio(ratio.value)}
                                    disabled={loading || trialEnded}
                                    aria-label={`Set aspect ratio to ${ratio.label} ${ratio.value}`}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border
                                    ${aspectRatio === ratio.value
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {ratio.label}
                                </button>
                            )
                            })}
                        </div>
                    </div>
                     <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-slate-400">Hoặc thử một ví dụ:</h3>
                            <button 
                            onClick={handleShuffle} 
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                            title="Xáo trộn ví dụ"
                            >
                            <DiceIcon className="w-4 h-4" />
                            Mới
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {shuffledPrompts.slice(0, 2).map((prompt, index) => (
                            <div
                                key={index}
                                onClick={() => !trialEnded && !loading && setPrompt(prompt)}
                                className={`cursor-pointer rounded-lg p-2 text-xs text-slate-300 transition-all duration-200 border border-slate-700 bg-slate-800/60 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-700 ${trialEnded || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                role="button"
                                aria-label={`Use prompt: ${prompt}`}
                            >
                                {prompt}
                            </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="pt-4 border-t border-slate-700/50">
                <button
                    onClick={handleGenerate}
                    disabled={loading || trialEnded || !prompt.trim()}
                    className="w-full flex items-center justify-center bg-gradient-to-r from-sky-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg hover:from-sky-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                    <>
                        <LoaderIcon className="animate-spin mr-2" />
                        {t('common.generating')}...
                    </>
                    ) : (
                      <>
                        <SparklesIcon className="mr-2" />
                        {t('textToImage.generateButton')}
                      </>
                    )}
                </button>
                {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
            </div>
        </div>
      
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 mb-4 self-start">{t('common.results')}</h2>
          <div className="w-full flex-grow flex items-center justify-center">
            {loading && (
              <div className="w-full">
                <ProgressBar progress={progress} statusText={statusText} accentColor="emerald" />
              </div>
            )}
            {imageUrls.length > 0 && !loading && (
              <div className="grid grid-cols-1 gap-8 w-full">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex flex-col items-center gap-3 bg-slate-800/40 p-3 rounded-xl">
                    <div className="bg-slate-900/50 p-2 rounded-xl shadow-inner w-full">
                      <img 
                        src={url} 
                        alt={`${prompt} - kết quả ${index + 1}`} 
                        className="w-full object-contain rounded-lg shadow-2xl"
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => onOpenPreview(url, () => handleDownload(url, index))}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-green-500/30"
                        aria-label={`Xem trước và tải ảnh ${index + 1}`}
                      >
                        <EyeIcon className="w-5 h-5" />
                        {t('common.previewAndDownload')}
                      </button>
                      <button
                        onClick={() => handleEdit(index)}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-blue-500/30"
                        aria-label={`Chỉnh sửa ảnh ${index + 1}`}
                      >
                        <EditIcon className="w-5 h-5" />
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleGeneratePrompt(url, index)}
                        disabled={generatingPrompts[index]}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-fuchsia-700 transition-all duration-200 shadow-md hover:shadow-purple-500/30 disabled:opacity-50"
                        aria-label={`Tạo prompt video từ ảnh ${index + 1}`}
                      >
                        {generatingPrompts[index] ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <MagicWandIcon className="w-5 h-5" />}
                        {generatingPrompts[index] ? t('common.generating')+'...' : t('textToImage.generateVideoPrompt')}
                      </button>
                    </div>
                    {generatedPrompts[index] && (
                      <div className="w-full bg-slate-800/50 p-3 rounded-lg mt-1 border border-slate-700 text-xs">
                        <p className="text-slate-300 italic">"{generatedPrompts[index]?.vi}"</p>
                        <div className="flex items-center gap-2 mt-2">
                            <button 
                              onClick={() => handleCopyPrompt(generatedPrompts[index]!, index)} 
                              className="flex items-center gap-2 text-sm text-cyan-300 bg-cyan-900/50 px-3 py-1 rounded-md hover:bg-cyan-800/50 transition-colors"
                            >
                              <CopyIcon className="w-4 h-4" />
                              {copiedPrompts[index] ? t('common.copiedPromptEn') : t('common.copyPromptEn')}
                            </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!loading && imageUrls.length === 0 && (
                <div className={`w-full flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600 ${getAspectRatioClass(aspectRatio)}`}>
                    <p className="text-center p-4">{t('textToImage.resultsPlaceholder')}</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextToImageGenerator;
