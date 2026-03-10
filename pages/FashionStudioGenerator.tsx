import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n';
import { LoaderIcon, SparklesIcon, UploadIcon, DownloadIcon, ShirtIcon, UserIcon, AspectRatioSquareIcon, AspectRatioTallIcon, AspectRatioWideIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import { extractFashionProduct, dressOnModel, displayFashionProduct } from '../services/geminiService';
import type { AspectRatio, ImageInput } from '../services/geminiService';
import ProgressBar from '../components/ProgressBar';

interface FashionStudioGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
}

type Tab = 'extract' | 'dress' | 'hang';
type FashionItem = 'áo' | 'quần' | 'váy';
type ImageState = { file: File | null; url: string | null };

// Helper functions
const fileToImageInput = (file: File): Promise<ImageInput> => {
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
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

// Aspect Ratio Config
const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '9:16', label: 'Dọc', icon: AspectRatioTallIcon },
  { value: '1:1', label: 'Vuông', icon: AspectRatioSquareIcon },
  { value: '16:9', label: 'Ngang', icon: AspectRatioWideIcon },
];

const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
        case '16:9': return 'aspect-[16/9]';
        case '9:16': return 'aspect-[9/16]';
        case '1:1': default: return 'aspect-square';
    }
};


const FashionStudioGenerator: React.FC<FashionStudioGeneratorProps> = ({
  isTrial,
  trialCreations,
  onTrialGenerate,
  onRequireLogin,
  onRequirePricing,
  onOpenPreview,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('extract');
  
  // Tab 1 (Extract) State
  const [modelImage, setModelImage] = useState<ImageState>({ file: null, url: null });
  const [selectedItems, setSelectedItems] = useState<FashionItem[]>([]);

  // Tab 2 (Dress) State
  const [clothingForDress, setClothingForDress] = useState<ImageState>({ file: null, url: null });
  const [newModel, setNewModel] = useState<ImageState>({ file: null, url: null });
  const [dressAspectRatio, setDressAspectRatio] = useState<AspectRatio>('9:16');
  const [dressPrompt, setDressPrompt] = useState('');

  // Tab 3 (Hang) State
  const [clothingForHang, setClothingForHang] = useState<ImageState>({ file: null, url: null });
  const [scenePrompt, setScenePrompt] = useState('');
  const [hangAspectRatio, setHangAspectRatio] = useState<AspectRatio>('1:1');
  
  // Shared State
  const [finalResultUrl, setFinalResultUrl] = useState<string | null>(null);
  const [extractedProduct, setExtractedProduct] = useState<ImageState>({ file: null, url: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  const trialEnded = isTrial && trialCreations <= 0;
  
  useEffect(() => {
    if (extractedProduct.url && extractedProduct.file) {
        if (activeTab === 'dress' && !clothingForDress.url) {
            setClothingForDress(extractedProduct);
        }
        if (activeTab === 'hang' && !clothingForHang.url) {
            setClothingForHang(extractedProduct);
        }
    }
  }, [activeTab, extractedProduct]);


  const handleFileSelect = (setter: React.Dispatch<React.SetStateAction<ImageState>>) => (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setter({ file, url: reader.result as string });
    };
    reader.readAsDataURL(file);
    setFinalResultUrl(null);
    setError(null);
  };

  const clearImage = (setter: React.Dispatch<React.SetStateAction<ImageState>>) => () => {
    setter({ file: null, url: null });
  };
  
  const handleExtract = async () => {
    if (!modelImage.file) { setError(t('fashionStudio.errorNoImage')); return; }
    if (selectedItems.length === 0) { setError(t('fashionStudio.errorNoItems')); return; }
    if (trialEnded) { setError('Bạn đã hết lượt tạo miễn phí.'); return; }

    if (isTrial) onTrialGenerate();
    setLoading(true);
    setError(null);
    setFinalResultUrl(null);
    setProgress(0);
    setStatusText(t('fashionStudio.statusExtracting'));

    try {
      setProgress(25);
      const imageInput = await fileToImageInput(modelImage.file);
      setProgress(50);
      const resultUrl = await extractFashionProduct(imageInput, selectedItems);
      setProgress(90);
      const resultFile = await dataUrlToFile(resultUrl, 'extracted_product.png');
      
      setExtractedProduct({ file: resultFile, url: resultUrl });
      setFinalResultUrl(resultUrl);
      
      setProgress(100);
      setStatusText(t('fashionStudio.statusSuccess'));
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tách sản phẩm.');
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDressOnModel = async () => {
    if (!clothingForDress.file) { setError(t('fashionStudio.errorNoClothing')); return; }
    if (!newModel.file) { setError(t('fashionStudio.errorNoNewModel')); return; }
    if (trialEnded) { setError('Bạn đã hết lượt tạo miễn phí.'); return; }

    if (isTrial) onTrialGenerate();
    setLoading(true);
    setError(null);
    setFinalResultUrl(null);
    setProgress(0);
    setStatusText(t('fashionStudio.statusDressing'));

    try {
      setProgress(25);
      const clothingInput = await fileToImageInput(clothingForDress.file);
      const modelInput = await fileToImageInput(newModel.file);
      setProgress(50);
      const resultUrl = await dressOnModel(clothingInput, modelInput, dressAspectRatio, dressPrompt);
      setProgress(95);
      setFinalResultUrl(resultUrl);
      
      setProgress(100);
      setStatusText(t('fashionStudio.statusDressingSuccess'));
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi mặc đồ lên mẫu.');
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDisplayProduct = async () => {
    if (!clothingForHang.file) { setError(t('fashionStudio.errorNoClothing')); return; }
    if (!scenePrompt.trim()) { setError(t('fashionStudio.errorNoScene')); return; }
    if (trialEnded) { setError('Bạn đã hết lượt tạo miễn phí.'); return; }

    if (isTrial) onTrialGenerate();
    setLoading(true);
    setError(null);
    setFinalResultUrl(null);
    setProgress(0);
    setStatusText(t('fashionStudio.statusHanging'));

    try {
      setProgress(25);
      const clothingInput = await fileToImageInput(clothingForHang.file);
      setProgress(50);
      const resultUrl = await displayFashionProduct(clothingInput, scenePrompt, hangAspectRatio);
      setProgress(95);
      setFinalResultUrl(resultUrl);
      
      setProgress(100);
      setStatusText(t('fashionStudio.statusHangingSuccess'));
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi trưng bày sản phẩm.');
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };
  
    const handleDownload = () => {
        if (!finalResultUrl) return;
        const link = document.createElement('a');
        link.href = finalResultUrl;
        link.download = `t-lab_fashion_studio_result.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

  const TABS: { id: Tab, label: string }[] = [
    { id: 'extract', label: t('fashionStudio.tabExtract') },
    { id: 'dress', label: t('fashionStudio.tabDress') },
    { id: 'hang', label: t('fashionStudio.tabHang') },
  ];
  
  const FASHION_ITEMS: FashionItem[] = ['áo', 'quần', 'váy'];

  const renderCurrentTab = () => {
    switch (activeTab) {
        case 'extract':
            return (
                <div className="flex flex-col gap-6">
                    <ImageInputBox
                        label={t('fashionStudio.uploadModelLabel')}
                        imageState={modelImage}
                        onFileSelect={handleFileSelect(setModelImage)}
                        Icon={UserIcon}
                        disabled={loading || trialEnded}
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('fashionStudio.itemsToExtractLabel')}</label>
                        <div className="flex flex-wrap gap-3">
                            {FASHION_ITEMS.map(item => (
                                <button key={item} onClick={() => setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}
                                    disabled={loading || trialEnded}
                                    className={`px-6 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${selectedItems.includes(item) ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'} disabled:opacity-50`}>
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-700/50">
                        <button onClick={handleExtract} disabled={loading || trialEnded || !modelImage.file || selectedItems.length === 0}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 text-lg">
                            {loading && activeTab === 'extract' ? <><LoaderIcon className="animate-spin mr-3" />Đang tách...</> : <><SparklesIcon className="mr-3" />{t('fashionStudio.extractButton')}</>}
                        </button>
                    </div>
                </div>
            );
        case 'dress':
             return (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <ImageInputBox label={t('fashionStudio.uploadClothingLabel')} imageState={clothingForDress} onFileSelect={handleFileSelect(setClothingForDress)} Icon={ShirtIcon} onClear={clearImage(setClothingForDress)} disabled={loading || trialEnded} />
                        <ImageInputBox label={t('fashionStudio.uploadNewModelLabel')} imageState={newModel} onFileSelect={handleFileSelect(setNewModel)} Icon={UserIcon} onClear={clearImage(setNewModel)} disabled={loading || trialEnded}/>
                    </div>
                    {extractedProduct.url && <button onClick={() => setClothingForDress(extractedProduct)} className="text-sm text-purple-400 hover:text-purple-300 w-full text-center py-2 bg-slate-700/50 rounded-lg">{t('fashionStudio.useExtractedProduct')}</button>}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('common.ratio')}</label>
                        <div className="flex items-center gap-2 flex-wrap">
                             {aspectRatios.map(r => <button key={r.value} onClick={() => setDressAspectRatio(r.value)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${dressAspectRatio === r.value ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}><r.icon className="w-4 h-4" />{r.label}</button>)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('fashionStudio.additionalPromptLabel')}</label>
                        <textarea value={dressPrompt} onChange={e => setDressPrompt(e.target.value)} rows={2} placeholder={t('fashionStudio.additionalPromptPlaceholder')} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 text-sm resize-none disabled:opacity-50" disabled={loading || trialEnded} />
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-700/50">
                        <button onClick={handleDressOnModel} disabled={loading || trialEnded || !clothingForDress.file || !newModel.file}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 text-lg">
                            {loading && activeTab === 'dress' ? <><LoaderIcon className="animate-spin mr-3" />Đang ghép...</> : <><SparklesIcon className="mr-3" />{t('fashionStudio.dressButton')}</>}
                        </button>
                    </div>
                </div>
            );
        case 'hang':
            return (
                <div className="flex flex-col gap-6">
                    <ImageInputBox label={t('fashionStudio.uploadClothingLabel')} imageState={clothingForHang} onFileSelect={handleFileSelect(setClothingForHang)} Icon={ShirtIcon} onClear={clearImage(setClothingForHang)} disabled={loading || trialEnded} />
                    {extractedProduct.url && <button onClick={() => setClothingForHang(extractedProduct)} className="text-sm text-purple-400 hover:text-purple-300 w-full text-center py-2 bg-slate-700/50 rounded-lg">{t('fashionStudio.useExtractedProduct')}</button>}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('common.ratio')}</label>
                        <div className="flex items-center gap-2 flex-wrap">
                             {aspectRatios.map(r => <button key={r.value} onClick={() => setHangAspectRatio(r.value)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${hangAspectRatio === r.value ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}><r.icon className="w-4 h-4" />{r.label}</button>)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('fashionStudio.sceneDescriptionLabel')}</label>
                        <textarea value={scenePrompt} onChange={e => setScenePrompt(e.target.value)} rows={3} placeholder={t('fashionStudio.sceneDescriptionPlaceholder')} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 text-sm resize-none disabled:opacity-50" disabled={loading || trialEnded} />
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-700/50">
                        <button onClick={handleDisplayProduct} disabled={loading || trialEnded || !clothingForHang.file || !scenePrompt.trim()}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 text-lg">
                           {loading && activeTab === 'hang' ? <><LoaderIcon className="animate-spin mr-3" />Đang trưng bày...</> : <><SparklesIcon className="mr-3" />{t('fashionStudio.hangButton')}</>}
                        </button>
                    </div>
                </div>
            );
    }
  };

  return (
    <div className="flex flex-col items-center">
        <div className="w-full max-w-5xl mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-cyan-300 mb-3">{t('fashionStudio.aiAllows')}</h2>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                    <li>{t('fashionStudio.allow1')}</li>
                    <li>{t('fashionStudio.allow2')}</li>
                    <li>{t('fashionStudio.allow3')}</li>
                </ul>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
                <div className="border-b border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                {renderCurrentTab()}
                {error && <p className="text-red-400 mt-2 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
            </div>
            
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 self-start">{t('fashionStudio.finalResultTitle')}</h2>
                <div className="w-full flex-grow flex flex-col items-center justify-center">
                    {loading && <div className="w-full"><ProgressBar progress={progress} statusText={statusText} accentColor="purple" /></div>}
                    {!loading && finalResultUrl && (
                        <div className="w-full flex flex-col items-center gap-4">
                            <div className={`bg-slate-900/50 p-2 rounded-lg w-full ${getAspectRatioClass(activeTab === 'dress' ? dressAspectRatio : hangAspectRatio)}`}>
                                <img src={finalResultUrl} alt="Final Result" className="w-full h-full object-contain rounded-md" />
                            </div>
                            <button onClick={() => onOpenPreview(finalResultUrl, handleDownload)}
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-green-500/30"
                                aria-label="Xem trước và tải ảnh">
                                <DownloadIcon className="w-5 h-5" />
                                {t('common.previewAndDownload')}
                            </button>
                        </div>
                    )}
                    {!loading && !finalResultUrl && (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600 aspect-square">
                            <p className="text-center p-4">{t('fashionStudio.resultPlaceholder')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

// Internal component for image inputs to reduce repetition
interface ImageInputBoxProps {
    label: string;
    imageState: ImageState;
    onFileSelect: (file: File) => void;
    Icon: React.FC<{className?: string}>;
    onClear?: () => void;
    disabled?: boolean;
}
const ImageInputBox: React.FC<ImageInputBoxProps> = ({ label, imageState, onFileSelect, Icon, onClear, disabled }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const triggerSelect = () => !disabled && inputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
    };
    
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div onClick={triggerSelect}
                className={`w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 relative ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-purple-500'}`}>
                <input type="file" ref={inputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={disabled} />
                {imageState.url ? (
                    <>
                        <img src={imageState.url} alt="Preview" className="w-full h-full object-contain rounded-md p-1" />
                        {onClear && <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-1 right-1 text-xs bg-red-800/80 text-white px-2 py-0.5 rounded-md hover:bg-red-700">Xóa</button>}
                    </>
                ) : (
                    <>
                        <Icon className="w-10 h-10 text-slate-400 mb-2" />
                        <p className="text-slate-300 text-xs">Tải ảnh lên</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default FashionStudioGenerator;