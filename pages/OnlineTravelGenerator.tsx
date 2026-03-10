
import React, { useState, useRef, useEffect } from 'react';
import { generateMultipleImageEdits, generatePromptFromImage, BilingualPrompt } from '../services/geminiService';
import { CameraIcon, LoaderIcon, SparklesIcon, DownloadIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, MagicWandIcon, CopyIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { AspectRatio } from '../services/geminiService';
import ProgressBar from '../components/ProgressBar';

interface OnlineTravelGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
}

type Destination = {
  id: string;
  name: string;
  prompt: string;
  country: 'Việt Nam' | 'Quốc Tế';
};

const destinations: Destination[] = [
  // Vietnam
  {
    id: 'halong',
    name: 'Vịnh Hạ Long',
    prompt: 'Photorealistic image of the person on a traditional wooden boat sailing through Ha Long Bay, Vietnam. The background features majestic limestone karsts rising from the emerald green water under a bright sun. Ensure the person is seamlessly integrated, preserving their facial features and pose.',
    country: 'Việt Nam',
  },
  {
    id: 'sapa',
    name: 'Ruộng bậc thang Sapa',
    prompt: 'Photorealistic image of the person standing amidst the stunning terraced rice fields of Sapa, Vietnam during the harvest season. The fields are a vibrant golden-yellow. The background features rolling hills and a clear blue sky. Ensure the person is naturally integrated, preserving their facial features.',
    country: 'Việt Nam',
  },
  {
    id: 'hoian',
    name: 'Phố cổ Hội An',
    prompt: 'Photorealistic image of the person releasing a lantern on the Hoai River in Hoi An Ancient Town, Vietnam, at night. The scene is magically illuminated by hundreds of colorful lanterns. Ensure the person is seamlessly integrated, preserving their facial features.',
    country: 'Việt Nam',
  },
  {
    id: 'danang_bridge',
    name: 'Cầu Vàng, Đà Nẵng',
    prompt: 'Photorealistic image of the person walking on the famous Golden Bridge (Cầu Vàng) in Da Nang, Vietnam, held up by giant stone hands. The view overlooks the mountains of Ba Na Hills on a clear day. Ensure the person looks naturally part of the scene, preserving their facial features.',
    country: 'Việt Nam',
  },
  {
    id: 'hue',
    name: 'Kinh thành Huế',
    prompt: 'Photorealistic image of the person dressed in a traditional Ao Dai standing in a courtyard of the Hue Imperial City, Vietnam. The architecture is ancient and majestic. The lighting is serene and respectful of the historical site. Ensure the person is seamlessly integrated, preserving their facial features.',
    country: 'Việt Nam',
  },
  // International
  {
    id: 'paris',
    name: 'Tháp Eiffel, Paris',
    prompt: 'Photorealistic image of the person seamlessly integrated into a romantic daytime scene in front of the Eiffel Tower in Paris. The lighting is soft and natural. Ensure the person looks like they are actually there, preserving their facial features and pose.',
    country: 'Quốc Tế',
  },
  {
    id: 'kyoto',
    name: 'Kyoto, Nhật Bản',
    prompt: 'Photorealistic image of the person walking through a traditional street in Kyoto, Japan, during the cherry blossom season. The scene is filled with pink sakura petals. The lighting is bright and cheerful. Ensure the person is naturally integrated, preserving their facial features and pose.',
    country: 'Quốc Tế',
  },
  {
    id: 'santorini',
    name: 'Santorini, Hy Lạp',
    prompt: 'Photorealistic image of the person standing on a balcony in Santorini, Greece, overlooking the iconic white and blue buildings and the Aegean Sea. It is a bright, sunny day. Ensure the person looks naturally part of the scene, preserving their facial features.',
    country: 'Quốc Tế',
  },
   {
    id: 'pyramids',
    name: 'Kim Tự Tháp',
    prompt: 'Photorealistic image of the person riding a camel in front of the Great Pyramids of Giza, Egypt. The sun is setting, casting a warm, golden glow over the desert landscape. Ensure the person is realistically placed on the camel, preserving their facial features.',
    country: 'Quốc Tế',
  },
  {
    id: 'newyork',
    name: 'New York, Mỹ',
    prompt: 'Photorealistic image of the person standing in the middle of a bustling Times Square, New York, at night. The scene is illuminated by vibrant neon signs and billboards. Ensure the person is seamlessly integrated into the crowd, preserving their facial features.',
    country: 'Quốc Tế',
  }
];

const vietnamDestinations = destinations.filter(d => d.country === 'Việt Nam');
const internationalDestinations = destinations.filter(d => d.country === 'Quốc Tế');

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

const LOCAL_STORAGE_KEY = 'tlab-OnlineTravelGenerator-state';
const GENERATION_COST = 2;

const OnlineTravelGenerator: React.FC<OnlineTravelGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
  
  const [generatingPrompts, setGeneratingPrompts] = useState<{ [key: number]: boolean }>({});
  const [generatedPrompts, setGeneratedPrompts] = useState<{ [key: number]: BilingualPrompt | null }>({});
  const [copiedPrompts, setCopiedPrompts] = useState<{ [key: number]: boolean }>({});

  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const trialEnded = isTrial && trialCreations < GENERATION_COST;

  useEffect(() => {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
        try {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.selectedDestinationId) setSelectedDestinationId(savedState.selectedDestinationId);
            if (savedState.customDestination) setCustomDestination(savedState.customDestination);
            if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
            if (savedState.additionalPrompt) setAdditionalPrompt(savedState.additionalPrompt);
        } catch(e) {
            console.error('Failed to parse OnlineTravelGenerator state', e);
        }
    }
  }, []);

  useEffect(() => {
    const stateToSave = { selectedDestinationId, aspectRatio, customDestination, additionalPrompt };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [selectedDestinationId, aspectRatio, customDestination, additionalPrompt]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    let finalPrompt = '';
    let basePrompt = '';

    if (selectedDestinationId === 'custom') {
        if (!customDestination.trim()) {
            setError('Vui lòng nhập mô tả điểm đến của bạn.');
            return;
        }
        basePrompt = `Photorealistic image of the person seamlessly integrated into a scene at ${customDestination.trim()}. The lighting should be natural and appropriate for the location. Ensure the person looks like they are actually there, preserving their facial features and pose.`;
    } else {
        const selectedDestination = destinations.find(d => d.id === selectedDestinationId);
        if (!selectedDestination) {
            setError('Vui lòng chọn một điểm đến.');
            return;
        }
        basePrompt = selectedDestination.prompt;
    }
    
    // Combine base prompt with additional instructions
    if (additionalPrompt.trim()) {
        finalPrompt = `${basePrompt} Also, incorporate the following details: ${additionalPrompt.trim()}.`;
    } else {
        finalPrompt = basePrompt;
    }

    // Add aspect ratio requirement at the end
    finalPrompt += ` IMPORTANT: The final output image MUST strictly adhere to a ${aspectRatio} aspect ratio. Do not alter this aspect ratio.`;


    if (trialEnded) {
      setError(`Bạn cần ít nhất ${GENERATION_COST} lượt tạo. Vui lòng đăng nhập.`);
      return;
    }
    if (!file) {
      setError('Vui lòng tải ảnh của bạn lên trước.');
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
    setStatusText('Chuẩn bị hành lý...');
    
    try {
      setProgress(20);
      setStatusText('Đang xử lý ảnh của bạn...');
      const { base64, mimeType } = await fileToBase64(file);

      setProgress(50);
      const destinationName = selectedDestinationId === 'custom' ? customDestination.trim() : destinations.find(d => d.id === selectedDestinationId)?.name;
      setStatusText(`Đang đưa bạn đến ${destinationName}...`);

      const resultUrls = await generateMultipleImageEdits(base64, mimeType, finalPrompt, 2);
      
      setProgress(90);
      setStatusText('Chụp ảnh kỷ niệm...');
      setGeneratedImages(resultUrls);

      setProgress(100);
      setStatusText('Chuyến đi thành công!');
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
    const originalFilename = file?.name.split('.').slice(0, -1).join('.') || 'travel';
    const destinationName = selectedDestinationId === 'custom' ? 'custom' : selectedDestinationId;
    link.download = `t-lab_${originalFilename}_${destinationName}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    setTimeout(() => {
        setCopiedPrompts(prev => ({ ...prev, [index]: false }));
    }, 2000);
  };
    
  const canGenerate = originalImage && ((selectedDestinationId && selectedDestinationId !== 'custom') || (selectedDestinationId === 'custom' && customDestination.trim()));

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
          Du Lịch Online
        </h1>
        <p className="text-lg text-slate-400">
          Chọn một điểm đến và để AI đưa bạn tới đó qua một bức ảnh!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col">
          {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
          
          <div className="flex-grow flex flex-col gap-6">
              {/* Step 1: Upload */}
              <div>
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">1</span> Tải ảnh của bạn</h2>
                <div
                  onClick={triggerFileSelect}
                  className={`w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${trialEnded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={trialEnded} />
                  {originalImage ? (
                    <img src={originalImage} alt="Original" className="w-full h-full object-contain rounded-md" />
                  ) : (
                    <><CameraIcon className="w-12 h-12 text-slate-400 mb-2" /><p className="text-slate-300">Nhấn để tải ảnh chân dung</p></>
                  )}
                </div>
              </div>
              
              {/* Step 2: Aspect Ratio */}
              <div>
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">2</span> Chọn tỉ lệ</h2>
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

              {/* Step 3: Additional Details */}
              <div>
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">3</span> Thêm mô tả (Tùy chọn)</h2>
                <textarea
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    placeholder="Ví dụ: 'mặc một bộ váy màu đỏ', 'thêm tuyết rơi', 'vào ban đêm'..."
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none"
                    rows={2}
                    disabled={loading || trialEnded || !originalImage}
                />
              </div>

              {/* Step 4: Select Destination */}
              <div className="flex-grow flex flex-col">
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">4</span> Chọn hoặc Nhập Điểm đến</h2>
                <div className="relative flex-grow flex flex-col gap-3">
                  <select
                    id="destination-select"
                    value={selectedDestinationId || ''}
                    onChange={(e) => setSelectedDestinationId(e.target.value)}
                    disabled={loading || !originalImage || trialEnded}
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                  >
                    <option value="" disabled>-- Chọn một điểm đến --</option>
                    <optgroup label="Việt Nam">
                      {vietnamDestinations.map(dest => (
                        <option key={dest.id} value={dest.id}>{dest.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Quốc Tế">
                      {internationalDestinations.map(dest => (
                        <option key={dest.id} value={dest.id}>{dest.name}</option>
                      ))}
                    </optgroup>
                    <option value="custom">Khác (Tự nhập)...</option>
                  </select>
                  <div className="pointer-events-none absolute top-0 right-0 flex items-center px-2 text-gray-400 h-12">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                  
                  {selectedDestinationId === 'custom' && (
                    <textarea
                        value={customDestination}
                        onChange={(e) => setCustomDestination(e.target.value)}
                        placeholder="Nhập địa điểm bạn muốn đến, ví dụ: 'trên đỉnh núi Everest', 'trong một khu rừng thần tiên'..."
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none"
                        rows={2}
                        disabled={loading || trialEnded || !originalImage}
                    />
                  )}
                </div>
              </div>
          </div>
          
          {/* Step 5: Generate */}
          <div className="mt-auto pt-6 border-t border-slate-700/50">
             <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">5</span> Tạo ảnh</h2>
             <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate || trialEnded}
              className="w-full flex items-center justify-center bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-emerald-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><LoaderIcon className="animate-spin mr-2" />Đang xử lý...</> : <><SparklesIcon className="mr-2" />Tạo 2 ảnh du lịch</>}
            </button>
          </div>
          {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>

        {/* Result */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 self-start">Kết quả</h2>
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
                                     <img src={image} alt={`Generated travel photo ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => handleDownload(image, index)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-3 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-green-500/30 text-sm"
                                    >
                                        <DownloadIcon className="w-4 h-4" /> Lưu ảnh
                                    </button>
                                    <button
                                        onClick={() => handleGeneratePrompt(image, index)}
                                        disabled={generatingPrompts[index]}
                                        className="flex-1 flex items-center justify-center gap-2 text-white bg-purple-600/80 hover:bg-purple-500 font-bold py-2 px-3 rounded-md transition-all text-sm disabled:opacity-50"
                                    >
                                        {generatingPrompts[index] ? <LoaderIcon className="w-4 h-4 animate-spin" /> : <MagicWandIcon className="w-4 h-4" />}
                                        Prompt Video
                                    </button>
                                </div>
                                {generatedPrompts[index] && (
                                    <div className="bg-slate-900/50 p-2.5 rounded-md text-xs">
                                        <p className="text-slate-300 italic">"{generatedPrompts[index]?.vi}"</p>
                                        <button
                                            onClick={() => handleCopyPrompt(generatedPrompts[index]!, index)}
                                            className="flex items-center gap-1.5 mt-2 text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-md hover:bg-cyan-800/50 transition-colors"
                                        >
                                            <CopyIcon className="w-3 h-3" />
                                            {copiedPrompts[index] ? 'Đã sao chép (English)!' : 'Sao chép (English)'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {generatedImages.length === 0 && !loading && (
                  <div className={`w-full flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600 ${getAspectRatioClass(aspectRatio)}`}>
                    <p className="text-center p-4">Ảnh du lịch của bạn sẽ xuất hiện ở đây.</p>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineTravelGenerator;
