import React, { useState, useRef, useEffect } from 'react';
import { generateProductPhotoshoot } from '../services/geminiService';
import { CameraIcon, LoaderIcon, SparklesIcon, EyeIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, BrushIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { AspectRatio } from '../services/geminiService';
import ProgressBar from '../components/ProgressBar';
import { useLanguage } from '../i18n';

interface ProductPhotoshootGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
}

const scenePrompts = [
    'Trên một khối đá cẩm thạch trắng với ánh sáng studio tối giản',
    'Nằm trên cát ở một bãi biển nhiệt đới, có bóng lá cọ',
    'Đặt trên một chiếc bàn gỗ mộc mạc bên cạnh một tách cà phê',
    'Bay lơ lửng giữa những đám mây mềm mại lúc hoàng hôn',
    'Chìm một nửa trong nước trong vắt với những gợn sóng',
];

const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '1:1', label: 'Vuông', icon: AspectRatioSquareIcon },
  { value: '4:3', label: '4:3', icon: BrushIcon },
  { value: '16:9', label: 'Ngang', icon: AspectRatioWideIcon },
  { value: '9:16', label: 'Dọc', icon: AspectRatioTallIcon },
];

const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
        case '16:9': return 'aspect-[16/9]';
        case '9:16': return 'aspect-[9/16]';
        case '4:3': return 'aspect-[4/3]';
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

const LOCAL_STORAGE_KEY = 'tlab-ProductPhotoshootGenerator-state';
const GENERATION_COST = 2; // Generating multiple images is expensive

const ProductPhotoshootGenerator: React.FC<ProductPhotoshootGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing, onOpenPreview }) => {
  const { t } = useLanguage();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scenePrompt, setScenePrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trialEnded = isTrial && trialCreations < GENERATION_COST;

  useEffect(() => {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
        try {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.scenePrompt) setScenePrompt(savedState.scenePrompt);
            if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
        } catch(e) { 
            console.error('Failed to parse ProductPhotoshootGenerator state', e);
        }
    }
  }, []);

  useEffect(() => {
    const stateToSave = { scenePrompt, aspectRatio };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [scenePrompt, aspectRatio]);

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
    if (!scenePrompt.trim()) {
        setError('Vui lòng nhập mô tả bối cảnh.');
        return;
    }
    if (!file) {
      setError('Vui lòng tải ảnh sản phẩm lên trước.');
      return;
    }
    if (trialEnded) {
      setError(`Bạn cần ít nhất ${GENERATION_COST} lượt tạo. Vui lòng đăng nhập.`);
      return;
    }

    if (isTrial) onTrialGenerate(GENERATION_COST);

    setLoading(true);
    setError(null);
    setGeneratedImages([]);
    setProgress(0);
    setStatusText('Chuẩn bị studio...');
    
    try {
      setProgress(20);
      setStatusText('Xử lý ảnh sản phẩm...');
      const { base64, mimeType } = await fileToBase64(file);

      setProgress(50);
      setStatusText(`Đang dựng bối cảnh: "${scenePrompt}"`);

      const resultUrls = await generateProductPhotoshoot({base64, mimeType}, scenePrompt, aspectRatio, 2);
      
      setProgress(90);
      setStatusText('Hoàn thiện ảnh chụp...');
      setGeneratedImages(resultUrls);

      setProgress(100);
      setStatusText('Tạo ảnh thành công!');
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo ảnh. Vui lòng thử lại.');
      console.error(err);
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `t-lab_product_shoot_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
    
  const canGenerate = originalImage && scenePrompt.trim();

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-fuchsia-500 mb-2">
          Chụp ảnh sản phẩm AI
        </h1>
        <p className="text-lg text-slate-400">
          Tải ảnh sản phẩm của bạn và đặt nó vào bất kỳ bối cảnh chuyên nghiệp nào bạn có thể tưởng tượng.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-6">
          {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
          
          <div>
            <h2 className="text-xl font-bold text-sky-400 mb-3"><span className="bg-sky-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">1</span> Tải ảnh sản phẩm</h2>
            <div
              onClick={triggerFileSelect}
              className={`w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${trialEnded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-sky-500'}`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={trialEnded} />
              {originalImage ? (
                <img src={originalImage} alt="Original Product" className="w-full h-full object-contain rounded-md p-2" />
              ) : (
                <><CameraIcon className="w-12 h-12 text-slate-400 mb-2" /><p className="text-slate-300">Nhấn để tải ảnh sản phẩm</p></>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-sky-400 mb-3"><span className="bg-sky-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">2</span> Mô tả bối cảnh</h2>
             <textarea
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="Ví dụ: 'trên một mặt hồ phản chiếu bầu trời đêm đầy sao'..."
                className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 resize-none"
                rows={3}
                disabled={loading || trialEnded || !originalImage}
            />
             <div className="mt-2 flex flex-wrap gap-2">
                {scenePrompts.slice(0, 3).map(prompt => (
                     <button key={prompt} onClick={() => setScenePrompt(prompt)} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md hover:bg-slate-700 transition-colors">
                        {prompt}
                     </button>
                ))}
             </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-sky-400 mb-3"><span className="bg-sky-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">3</span> Chọn tỉ lệ</h2>
             <div className="flex items-center gap-2 flex-wrap">
                  {aspectRatios.map((ratio) => (
                      <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} disabled={loading || trialEnded}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border
                          ${aspectRatio === ratio.value ? 'bg-sky-500/20 border-sky-500 text-sky-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                          <ratio.icon className="w-4 h-4" />{ratio.label}
                      </button>
                  ))}
              </div>
          </div>
          
          <div className="mt-auto pt-6 border-t border-slate-700/50">
             <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate || trialEnded}
              className="w-full flex items-center justify-center bg-gradient-to-r from-sky-600 to-fuchsia-600 text-white font-bold py-3 px-6 rounded-lg hover:from-sky-700 hover:to-fuchsia-700 transition-all duration-200 shadow-lg hover:shadow-sky-500/30 disabled:opacity-50"
            >
              {loading ? <><LoaderIcon className="animate-spin mr-2" />Đang tạo ảnh...</> : <><SparklesIcon className="mr-2" />Tạo 2 ảnh sản phẩm</>}
            </button>
          </div>
          {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>

        {/* Result */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-fuchsia-400 mb-4 self-start">{t('common.results')}</h2>
            <div className="w-full flex-grow flex items-center justify-center">
                {loading && <div className="w-full"><ProgressBar progress={progress} statusText={statusText} accentColor="sky" /></div>}
                {generatedImages.length > 0 && !loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        {generatedImages.map((image, index) => (
                            <div key={index} className="flex flex-col gap-2 bg-slate-800/40 p-2 rounded-xl">
                                <div className={`w-full bg-slate-900/50 rounded-lg overflow-hidden ${getAspectRatioClass(aspectRatio)}`}>
                                     <img src={image} alt={`Generated product photo ${index + 1}`} className="w-full h-full object-cover" />
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
                    <p className="text-center p-4">Ảnh sản phẩm của bạn sẽ xuất hiện ở đây.</p>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPhotoshootGenerator;
