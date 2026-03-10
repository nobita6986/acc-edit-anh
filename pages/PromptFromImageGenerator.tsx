import React, { useState, useRef, useEffect } from 'react';
import { generatePromptFromImage, BilingualPrompt } from '../services/geminiService';
import { UploadIcon, LoaderIcon, MagicWandIcon, CopyIcon, RefreshCwIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';

interface PromptFromImageGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
}

const LOCAL_STORAGE_KEY = 'tlab-PromptFromImageGenerator-state';

const PromptFromImageGenerator: React.FC<PromptFromImageGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing }) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<BilingualPrompt | null>(null);
  const [userWish, setUserWish] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trialEnded = isTrial && trialCreations <= 0;

  // On mount: Load state from local storage
  useEffect(() => {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
        try {
            const savedState = JSON.parse(savedStateJSON);
            // Do not load imageDataUrl from localStorage to improve performance and prevent errors.
            if (savedState.generatedPrompt) setGeneratedPrompt(savedState.generatedPrompt);
            if (savedState.userWish) setUserWish(savedState.userWish);
        } catch(e) { 
            console.error('Failed to parse PromptFromImageGenerator state', e);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    }
  }, []);

  // On state change: Save state to local storage
  useEffect(() => {
    // Do not save imageDataUrl to localStorage.
    const stateToSave = { generatedPrompt, userWish };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [generatedPrompt, userWish]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setGeneratedPrompt(null);
      setError(null);
      
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        setImageDataUrl(reader.result as string);
      };
    }
  };

  const triggerFileSelect = () => {
    if (trialEnded) return;
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (trialEnded) {
        setError('Bạn đã hết lượt tạo miễn phí. Vui lòng đăng nhập để tiếp tục.');
        return;
    }
    if (!imageDataUrl) {
      setError('Vui lòng tải lên một ảnh để tạo prompt.');
      return;
    }

    if (isTrial) {
        onTrialGenerate();
    }

    setLoading(true);
    setError(null);
    setGeneratedPrompt(null);

    try {
      const [header, data] = imageDataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      const promptObject = await generatePromptFromImage(data, mimeType, userWish);
      setGeneratedPrompt(promptObject);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tạo prompt. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyPrompt = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt.en);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 mb-2">
          Tạo Prompt từ Ảnh
        </h1>
        <p className="text-lg text-slate-400">
          Tải lên một hình ảnh và để AI tạo ra một kịch bản video sống động từ đó.
        </p>
      </div>

      <div className="w-full max-w-5xl">
        {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left side: Upload */}
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 self-start">1. Tải ảnh lên</h2>
            <div 
                onClick={triggerFileSelect}
                className={`w-full aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${trialEnded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-pink-500 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]'}`}
            >
                <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/webp"
                className="hidden" 
                disabled={trialEnded}
                />
                {imageDataUrl ? (
                <img src={imageDataUrl} alt="Uploaded preview" className="w-full h-full object-contain rounded-md p-2" />
                ) : (
                <>
                    <UploadIcon className="w-12 h-12 text-slate-400 mb-2" />
                    <p className="text-slate-300">Nhấn để tải ảnh lên</p>
                    <p className="text-xs text-slate-500">PNG, JPG, WEBP</p>
                </>
                )}
            </div>
             <div className="mt-4 w-full">
                <label htmlFor="userWish" className="block text-sm font-medium text-slate-300 mb-2">2. Mô tả mong muốn (tùy chọn)</label>
                <textarea
                    id="userWish"
                    value={userWish}
                    onChange={(e) => setUserWish(e.target.value)}
                    placeholder="Ví dụ: 'tạo một video quảng cáo cho sản phẩm cà phê', 'làm cho cảnh này trở nên ma mị hơn'..."
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none"
                    rows={3}
                    disabled={loading || !imageDataUrl || trialEnded}
                />
            </div>
            <button
                onClick={handleGenerate}
                disabled={loading || !imageDataUrl || trialEnded}
                className="mt-6 w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                <>
                    <LoaderIcon className="animate-spin mr-2" />
                    Đang phân tích...
                </>
                ) : (
                <>
                    <MagicWandIcon className="mr-2" />
                    Tạo Prompt
                </>
                )}
            </button>
            </div>
            
            {/* Right side: Result */}
            <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 self-start">Prompt được tạo ra</h2>
            <div className="w-full flex-grow bg-slate-900/50 rounded-lg flex items-center justify-center border border-dashed border-slate-600 p-4 min-h-[200px]">
                {loading && (
                <div className="text-center">
                    <LoaderIcon className="w-12 h-12 text-pink-500 animate-spin mb-4 mx-auto" />
                    <p className="text-slate-400">AI đang suy nghĩ...</p>
                </div>
                )}
                {generatedPrompt && !loading && (
                <div className="w-full self-start flex flex-col h-full">
                    <div className="flex-grow overflow-y-auto pr-2">
                        <p className="text-slate-300 italic">"{generatedPrompt.vi}"</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap items-center gap-3">
                        <button 
                            onClick={handleCopyPrompt} 
                            className="flex items-center gap-2 text-sm text-cyan-300 bg-cyan-900/50 px-3 py-2 rounded-md hover:bg-cyan-800/50 transition-colors"
                        >
                            <CopyIcon className="w-4 h-4" />
                            {copied ? 'Đã sao chép (English)!' : 'Sao chép prompt (English)'}
                        </button>
                        <button 
                            onClick={handleGenerate} 
                            disabled={loading || !imageDataUrl || trialEnded}
                            className="flex items-center gap-2 text-sm text-amber-300 bg-amber-900/50 px-3 py-2 rounded-md hover:bg-amber-800/50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCwIcon className="w-4 h-4" />
                            Tạo lại
                        </button>
                    </div>
                </div>
                )}
                {!generatedPrompt && !loading && (
                <p className="text-slate-500 text-center">Prompt được tạo ra sẽ xuất hiện ở đây.</p>
                )}
            </div>
            {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PromptFromImageGenerator;