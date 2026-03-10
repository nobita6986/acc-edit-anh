import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateAdCreative, AspectRatio, generatePromptFromImage, BilingualPrompt } from '../services/geminiService';
import { UserIcon, ShirtIcon, DiamondIcon, LoaderIcon, SparklesIcon, EyeIcon, UploadIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, MagicWandIcon, CopyIcon, EditIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { ImageToEdit } from '../App';
import ProgressBar from '../components/ProgressBar';

type UploadBoxProps = {
  Icon: React.FC<{className?: string}>;
  title: string;
  imageUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  accentColor: string;
  disabled?: boolean;
};

interface AdCreativeGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onEditImage: (image: ImageToEdit) => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
}

const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '1:1', label: 'Vuông', icon: AspectRatioSquareIcon },
  { value: '16:9', label: 'Ngang', icon: AspectRatioWideIcon },
  { value: '9:16', label: 'Dọc', icon: AspectRatioTallIcon },
];

const getAspectRatioClass = (ratio: AspectRatio) => {
  switch (ratio) {
    case '16:9': return 'aspect-[16/9]';
    case '9:16': return 'aspect-[9/16]';
    case '1:1':
    default:
      return 'aspect-square';
  }
};

// Helper functions for file handling
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

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}


const UploadBox: React.FC<UploadBoxProps> = ({ Icon, title, imageUrl, onFileSelect, onClear, accentColor, disabled }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileSelect(e.target.files[0]);
    }
     e.target.value = ''; // Allow re-uploading the same file
  };
  
  const triggerFileInput = () => {
    if (disabled) return;
    document.getElementById(`file-input-${title.replace(/\s+/g, '-')}`)?.click();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        onClick={triggerFileInput}
        className={`relative group w-full h-32 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center transition-all duration-300 
          ${disabled ? 'cursor-not-allowed opacity-50' : `cursor-pointer hover:border-${accentColor}-500 hover:bg-slate-800/50`}`
        }
      >
        <input 
          id={`file-input-${title.replace(/\s+/g, '-')}`}
          type="file" 
          onChange={handleFileChange} 
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          disabled={disabled}
        />
        {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-contain rounded-xl p-1" />
        ) : (
          <div className="text-center text-slate-400">
            <Icon className={`w-10 h-10 mx-auto mb-1 text-${accentColor}-400`} />
            <p className="text-xs font-semibold text-slate-300">{title}</p>
          </div>
        )}
      </div>
      {imageUrl && <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300" disabled={disabled}>Xóa ảnh</button>}
    </div>
  );
};

const LOCAL_STORAGE_KEY = 'tlab-AdCreativeGenerator-state';
const GENERATION_COST = 2;

const AdCreativeGenerator: React.FC<AdCreativeGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing, onEditImage, onOpenPreview }) => {
    type ImageState = { file: File, url: string } | null;

    const [modelImage, setModelImage] = useState<ImageState>(null);
    const [clothingImage, setClothingImage] = useState<ImageState>(null);
    const [accessoryImage, setAccessoryImage] = useState<ImageState>(null);

    const [userPrompt, setUserPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [generatedImages, setGeneratedImages] = useState<{ file: File, url: string }[]>([]);
    const [generatingPrompts, setGeneratingPrompts] = useState<{ [key: number]: boolean }>({});
    const [generatedPrompts, setGeneratedPrompts] = useState<{ [key: number]: BilingualPrompt | null }>({});
    const [copiedPrompts, setCopiedPrompts] = useState<{ [key: number]: boolean }>({});
    
    const [progress, setProgress] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>('');

    const trialEnded = isTrial && trialCreations < GENERATION_COST;

    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const parsed = JSON.parse(savedStateJSON);
                if(parsed.userPrompt) setUserPrompt(parsed.userPrompt);
                if(parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
            } catch (e) {
                console.error("Failed to parse AdCreativeGenerator state", e);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    }, []);

    useEffect(() => {
        const stateToSave = { userPrompt, aspectRatio };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }, [userPrompt, aspectRatio]);

    const handleFileSelect = (setter: React.Dispatch<React.SetStateAction<ImageState>>) => (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => setter({ file, url: reader.result as string });
        reader.readAsDataURL(file);
    };

    const handleClear = (setter: React.Dispatch<React.SetStateAction<ImageState>>) => () => {
        setter(null);
    };
    
    const handleGenerate = async () => {
        if (trialEnded) {
            setError(`Bạn cần ít nhất ${GENERATION_COST} lượt tạo. Vui lòng đăng nhập.`);
            return;
        }
        if (!modelImage && !clothingImage && !accessoryImage) {
            setError('Vui lòng tải lên ít nhất một ảnh (người mẫu, trang phục, hoặc sản phẩm).');
            return;
        }

        if (isTrial) onTrialGenerate(GENERATION_COST);

        setLoading(true);
        setError(null);
        setGeneratedImages([]);
        setGeneratedPrompts({});
        setGeneratingPrompts({});
        setCopiedPrompts({});
        setProgress(0);
        setStatusText('Bắt đầu quá trình sáng tạo...');

        try {
            setProgress(15);
            setStatusText('Đang chuẩn bị dữ liệu ảnh...');

            const convertToInput = async (imgState: ImageState) => {
                if (!imgState) return null;
                const { base64, mimeType } = await fileToBase64(imgState.file);
                return { base64, mimeType };
            };

            const [model, clothing, accessory] = await Promise.all([
                convertToInput(modelImage),
                convertToInput(clothingImage),
                convertToInput(accessoryImage),
            ]);

            setProgress(40);
            setStatusText('AI đang lên ý tưởng bố cục...');
            const resultUrls = await generateAdCreative(model, clothing, accessory, userPrompt, aspectRatio);
            
            setProgress(80);
            setStatusText('Đang kết xuất hình ảnh cuối cùng...');
            const files = await Promise.all(
                resultUrls.map((url, index) => dataUrlToFile(url, `t-lab_ad_creative_${index + 1}.png`))
            );

            setGeneratedImages(resultUrls.map((url, index) => ({ url, file: files[index] })));
            setProgress(100);
            setStatusText('Tạo ảnh quảng cáo thành công!');

            setTimeout(() => setLoading(false), 1000);

        } catch (err: any) {
            setError(err.message || 'Lỗi khi tạo ảnh quảng cáo.');
            console.error(err);
            setLoading(false);
            setProgress(0);
            setStatusText('');
        }
    };

    const handleDownload = (imageUrl: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `t-lab_ad_creative_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = (index: number) => {
        const image = generatedImages[index];
        if (image) onEditImage({ url: image.url, file: image.file });
    };

    const handleGeneratePrompt = async (imageUrl: string, index: number) => {
        setGeneratingPrompts(prev => ({ ...prev, [index]: true }));
        setError(null);
        try {
            const [header, data] = imageUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            const promptObject = await generatePromptFromImage(data, mimeType);
            setGeneratedPrompts(prev => ({ ...prev, [index]: promptObject }));
        } catch (err: any) {
           setError(err.message || `Không thể tạo prompt cho ảnh ${index + 1}.`);
           console.error(err);
        } finally {
            setGeneratingPrompts(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleCopyPrompt = (promptObject: BilingualPrompt, index: number) => {
        navigator.clipboard.writeText(promptObject.en);
        setCopiedPrompts(prev => ({ ...prev, [index]: true }));
        setTimeout(() => setCopiedPrompts(prev => ({...prev, [index]: false})), 2000);
    };

    const canGenerate = modelImage || clothingImage || accessoryImage;

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                    Ghép Ảnh Quảng Cáo
                </h1>
                <p className="text-lg text-slate-400">Tải lên ảnh người mẫu, trang phục, sản phẩm và để AI tạo ra một bức ảnh quảng cáo chuyên nghiệp.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
                <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
                    {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                    
                    <div className="grid grid-cols-3 gap-4">
                        <UploadBox Icon={UserIcon} title="Ảnh người mẫu" imageUrl={modelImage?.url || null} onFileSelect={handleFileSelect(setModelImage)} onClear={handleClear(setModelImage)} accentColor="sky" disabled={trialEnded || loading} />
                        <UploadBox Icon={ShirtIcon} title="Ảnh trang phục" imageUrl={clothingImage?.url || null} onFileSelect={handleFileSelect(setClothingImage)} onClear={handleClear(setClothingImage)} accentColor="emerald" disabled={trialEnded || loading} />
                        <UploadBox Icon={DiamondIcon} title="Ảnh sản phẩm" imageUrl={accessoryImage?.url || null} onFileSelect={handleFileSelect(setAccessoryImage)} onClear={handleClear(setAccessoryImage)} accentColor="fuchsia" disabled={trialEnded || loading} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Mô tả bối cảnh (tùy chọn)</label>
                        <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)} placeholder="ví dụ: 'một quán cà phê sang trọng ở Paris', 'bãi biển lúc hoàng hôn'..." rows={2}
                            className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 transition-all text-sm resize-none disabled:opacity-50"
                            disabled={trialEnded || loading} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Tỉ lệ</label>
                        <div className="flex items-center gap-2 flex-wrap">
                            {aspectRatios.map((ratio) => (
                                <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} disabled={trialEnded || loading}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border
                                    ${aspectRatio === ratio.value ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                                    <ratio.icon className="w-4 h-4" />{ratio.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-700/50">
                        <button onClick={handleGenerate} disabled={loading || !canGenerate || trialEnded}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-sky-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg hover:from-sky-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg">
                            {loading ? <><LoaderIcon className="animate-spin mr-3" />Đang ghép ảnh...</> : <><SparklesIcon className="mr-3" />Tạo 2 ảnh</>}
                        </button>
                        {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    </div>
                </div>

                <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400 mb-4">Kết quả</h2>
                    <div className="w-full flex-grow flex items-center justify-center">
                        {loading && (
                            <div className="w-full">
                                <ProgressBar progress={progress} statusText={statusText} accentColor="emerald" />
                            </div>
                        )}
                        {generatedImages.length > 0 && !loading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                {generatedImages.map((image, index) => (
                                    <div key={index} className="flex flex-col gap-2 bg-slate-800/40 p-2 rounded-xl">
                                        <div className={`w-full bg-slate-900/50 rounded-lg overflow-hidden ${getAspectRatioClass(aspectRatio)}`}>
                                            <img src={image.url} alt={`Generated ad ${index + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <button onClick={() => onOpenPreview(image.url, () => handleDownload(image.url, index))} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-3 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md text-sm"><EyeIcon className="w-4 h-4" />Xem & Tải</button>
                                            <button onClick={() => handleEdit(index)} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-2 px-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md text-sm"><EditIcon className="w-4 h-4" />Sửa</button>
                                            <button onClick={() => handleGeneratePrompt(image.url, index)} disabled={generatingPrompts[index]} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-bold py-2 px-3 rounded-lg hover:from-purple-600 hover:to-fuchsia-700 transition-all shadow-md text-sm disabled:opacity-50"><MagicWandIcon className="w-4 h-4" />Prompt</button>
                                        </div>
                                        {generatedPrompts[index] && (
                                            <div className="bg-slate-900/50 p-2.5 rounded-md text-xs">
                                                <p className="text-slate-300 italic">"{generatedPrompts[index]?.vi}"</p>
                                                <button onClick={() => handleCopyPrompt(generatedPrompts[index]!, index)} className="flex items-center gap-1.5 mt-2 text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-md hover:bg-cyan-800/50 transition-colors">
                                                    <CopyIcon className="w-3 h-3" />
                                                    {copiedPrompts[index] ? 'Đã sao chép (English)!' : 'Sao chép (English)'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && generatedImages.length === 0 && (
                            <div className={`w-full flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600 ${getAspectRatioClass(aspectRatio)}`}>
                                <p className="text-center p-4">Ảnh quảng cáo của bạn sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdCreativeGenerator;