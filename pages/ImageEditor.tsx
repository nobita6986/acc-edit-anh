

import React, { useState, useRef, useEffect } from 'react';
import { removeBackground, restoreOldPhoto, upscaleImage, editImageWithText } from '../services/geminiService';
import { LoaderIcon, SparklesIcon, EyeIcon, ChevronDownIcon } from '../components/Icons';
import PromptExamples from '../components/PromptExamples';
import ColorPalette from '../components/ColorPalette';
import TrialEndedCta from '../components/TrialEndedCta';
import type { ImageToEdit } from '../App';
import ProgressBar from '../components/ProgressBar';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

interface ImageEditorProps {
  initialImage: ImageToEdit | null;
  onEditComplete: () => void;
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
}

// Helper function to convert file to base64
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

const colorPalette = [
    { name: 'Đỏ', hex: '#ef4444' },
    { name: 'Cam', hex: '#f97316' },
    { name: 'Vàng', hex: '#eab308' },
    { name: 'Xanh lá', hex: '#22c55e' },
    { name: 'Xanh ngọc', hex: '#14b8a6' },
    { name: 'Xanh da trời', hex: '#3b82f6' },
    { name: 'Chàm', hex: '#6366f1' },
    { name: 'Tím', hex: '#8b5cf6' },
    { name: 'Hồng', hex: '#ec4899' },
    { name: 'Trắng', hex: '#ffffff' },
    { name: 'Xám', hex: '#6b7280' },
    { name: 'Đen', hex: '#000000' },
];

const editingPrompts = [
  'Thêm một cặp kính râm cho người trong ảnh',
  'Thay đổi nền thành một cảnh đêm đầy sao',
  'Làm cho nó trông giống như một bức tranh màu nước',
  'Thêm pháo hoa vào bầu trời',
  'Đặt một con mèo đang ngủ trên ghế sofa',
];


const LOCAL_STORAGE_KEY = 'tlab-ImageEditor-state';

const ImageEditor: React.FC<ImageEditorProps> = ({ initialImage, onEditComplete, isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing, onOpenPreview }) => {
  const { t } = useLanguage();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTool, setActiveTool] = useState<string>('describe');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');

  const trialEnded = isTrial && trialCreations <= 0;
  
  const tools = [
    { id: 'describe', translationKey: 'imageEditor.editWithDescription' },
    { id: 'removeBg', translationKey: 'imageEditor.removeBackground' },
    { id: 'restore', translationKey: 'imageEditor.restoreOldPhoto' },
    { id: 'upscale', translationKey: 'imageEditor.upscaleImage' },
  ];
  
  // On mount: Load state from local storage
  useEffect(() => {
    if (initialImage) return; 
    
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.prompt) setPrompt(savedState.prompt);
        if (savedState.activeTool) setActiveTool(savedState.activeTool);
      } catch (e) {
        console.error('Failed to parse ImageEditor state, clearing.', e);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, [initialImage]);
  
  // On state change: Save state to local storage
  useEffect(() => {
    const stateToSave = { prompt, activeTool };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [prompt, activeTool]);

  useEffect(() => {
    if (initialImage) {
      setFile(initialImage.file);
      setEditedImage(null);
      setPrompt('');
      setError(null);
      setActiveTool('describe');

      if (initialImage.url.startsWith('data:')) {
          setOriginalImage(initialImage.url);
      } else {
          const reader = new FileReader();
          reader.readAsDataURL(initialImage.file);
          reader.onloadend = () => {
              setOriginalImage(reader.result as string);
          };
      }
      onEditComplete();
    }
  }, [initialImage, onEditComplete]);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setEditedImage(null);
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
    }
  };

  const triggerFileSelect = () => {
    if (trialEnded) return;
    fileInputRef.current?.click();
  };

  const handleEdit = async () => {
    if (trialEnded) {
        setError('Bạn đã hết lượt tạo miễn phí. Vui lòng đăng nhập để tiếp tục.');
        return;
    }
    if (!file) {
      setError('Vui lòng tải lên ảnh để bắt đầu chỉnh sửa.');
      return;
    }
    if (activeTool === 'describe' && !prompt.trim()) {
      setError('Vui lòng nhập mô tả chỉnh sửa.');
      return;
    }

    if (isTrial) onTrialGenerate();

    setLoading(true);
    setError(null);
    setEditedImage(null);
    setProgress(0);

    try {
      setProgress(25);
      const { base64, mimeType } = await fileToBase64(file);
      let resultUrl = '';

      switch(activeTool) {
        case 'removeBg':
          setStatusText(t('imageEditor.statusRemovingBg'));
          resultUrl = await removeBackground(base64, mimeType);
          break;
        case 'restore':
          setStatusText(t('imageEditor.statusRestoring'));
          resultUrl = await restoreOldPhoto(base64, mimeType);
          break;
        case 'upscale':
          setStatusText(t('imageEditor.statusUpscaling'));
          resultUrl = await upscaleImage(base64, mimeType);
          break;
        case 'describe':
        default:
          setStatusText('AI đang phân tích yêu cầu...');
          resultUrl = await editImageWithText(base64, mimeType, prompt);
          break;
      }
      
      setProgress(75);
      setStatusText('Áp dụng các thay đổi...');
      setEditedImage(resultUrl);

      setProgress(100);
      setStatusText('Chỉnh sửa thành công!');

      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi chỉnh sửa ảnh. Vui lòng thử lại.');
      console.error(err);
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    const originalFilename = file?.name.split('.').slice(0, -1).join('.') || 'image';
    link.download = `t-lab_edited_${originalFilename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const currentTool = tools.find(tool => tool.id === activeTool);

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-indigo-500 mb-2">
          {t('imageEditor.title')}
        </h1>
        <p className="text-lg text-slate-400">
          {t('imageEditor.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Left Side: Upload & Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-6">
          {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
          
          <div 
            onClick={triggerFileSelect}
            className={`w-full p-4 min-h-[200px] bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${trialEnded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-blue-500'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/png, image/jpeg, image/webp"
              className="hidden" 
              disabled={trialEnded}
            />
            {originalImage ? (
              <img src={originalImage} alt="Original" className="w-full max-h-64 object-contain rounded-md" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-md border-2 border-slate-400 flex items-center justify-center mb-3">
                    <ChevronDownIcon className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-300 font-semibold">{t('imageEditor.uploadTitle')}</p>
                <p className="text-xs text-slate-500">{t('imageEditor.uploadSubtitle')}</p>
              </>
            )}
          </div>
          
          {originalImage && (
            <div className="flex-grow flex flex-col gap-6">
              <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-slate-300 mb-4">{t('imageEditor.editingTools')}</h3>
                <div className="flex flex-col gap-3">
                  {tools.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      disabled={loading}
                      className={`w-full text-left p-3 rounded-lg transition-colors duration-200 font-medium text-base
                        ${activeTool === tool.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200'
                        } disabled:opacity-50`}
                    >
                      {t(tool.translationKey)}
                    </button>
                  ))}
                </div>
                 <p className="text-center text-slate-500 my-4 text-sm">{t('imageEditor.orSelectNewAspectRatio')}</p>
                <button
                  onClick={() => {}}
                  disabled
                  className="w-full text-left p-3 rounded-lg font-medium text-base bg-slate-700/50 text-slate-200 opacity-50 cursor-not-allowed"
                >
                  {t('imageEditor.expandImage')}
                </button>
              </div>

              {activeTool === 'describe' && (
                <div className="flex flex-col gap-4">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('imageEditor.editPlaceholder')}
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200 resize-none"
                    rows={3}
                    disabled={loading || trialEnded}
                  />
                  <PromptExamples prompts={editingPrompts} onSelectPrompt={setPrompt} colorScheme="fuchsia" />
                  <ColorPalette colors={colorPalette} onSelectColor={(color) => setPrompt(p => `${p}, using the color ${color}`)} />
                </div>
              )}
            
              <div className="mt-auto pt-6 border-t border-slate-700/50">
                <button
                  onClick={handleEdit}
                  disabled={loading || trialEnded}
                  className="w-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {loading ? (
                    <>
                      <LoaderIcon className="animate-spin mr-2" />
                      {t('common.processing')}...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="mr-2" />
                      {t('imageEditor.execute')} {currentTool && t(currentTool.translationKey)}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>

        {/* Right Side: Result */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4 self-start">{t('common.results')}</h2>
          <div className="w-full aspect-square bg-slate-900/50 rounded-lg flex items-center justify-center border border-dashed border-slate-600">
            {loading && (
              <div className="w-full max-w-sm">
                <ProgressBar progress={progress} statusText={statusText} accentColor="sky" />
              </div>
            )}
            {editedImage && !loading && (
              <img src={editedImage} alt="Edited" className="w-full h-full object-contain rounded-md transition-all duration-300"/>
            )}
            {!editedImage && !loading && (
              <p className="text-slate-500">{t('imageEditor.resultsPlaceholder')}</p>
            )}
          </div>
          {editedImage && !loading && (
            <div className='w-full mt-4 flex flex-col gap-4'>
              <button
                onClick={() => onOpenPreview(editedImage, handleDownload)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-green-500/30"
                aria-label="Xem trước và lưu ảnh"
              >
                <EyeIcon className="w-5 h-5" />
                {t('common.previewAndDownload')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
