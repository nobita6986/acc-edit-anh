import React, { useState, useEffect, useRef } from 'react';
import { startVideoGeneration, pollVideoGeneration, VideoStyle, AspectRatio, ImageInput } from '../services/geminiService';
import { LoaderIcon, SparklesIcon, DownloadIcon, VideoIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, UploadIcon, CloseIcon } from '../components/Icons';
import ProgressBar from '../components/ProgressBar';

const videoStyles: VideoStyle[] = ['Mặc định', 'Điện ảnh', 'Sống động', 'Tối giản'];

const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '16:9', label: 'Ngang', icon: AspectRatioWideIcon },
  { value: '9:16', label: 'Dọc', icon: AspectRatioTallIcon },
  { value: '1:1', label: 'Vuông', icon: AspectRatioSquareIcon },
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

const LOCAL_STORAGE_KEY = 'tlab-VideoGenerator-state';

const fileToInput = (file: File): Promise<ImageInput> => {
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

const VideoGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [style, setStyle] = useState<VideoStyle>('Mặc định');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [progress, setProgress] = useState(0);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const imageFileInputRef = useRef<HTMLInputElement>(null);

    // On mount: Load state from local storage
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.prompt) setPrompt(savedState.prompt);
                if (savedState.style) setStyle(savedState.style);
                if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
            } catch (e) {
                console.error('Failed to parse VideoGenerator state', e);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    }, []);

    // On state change: Save state to local storage
    useEffect(() => {
        const stateToSave = { prompt, style, aspectRatio };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    }, [prompt, style, aspectRatio]);

    // Cleanup effect for blob URLs and intervals
    useEffect(() => {
        const currentVideoUrl = videoUrl;
        const currentInterval = progressIntervalRef.current;
        return () => {
            if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
            if (currentInterval) clearInterval(currentInterval);
        };
    }, [videoUrl]);
    
    const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setImageFile(selectedFile);
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
        }
    };

    const triggerFileSelect = (ref: React.RefObject<HTMLInputElement>) => () => {
        if (loading) return;
        ref.current?.click();
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        setImageFile(null);
        setImageUrl(null);
        if (imageFileInputRef.current) {
            imageFileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() && !imageFile) {
            setError('Vui lòng nhập mô tả hoặc tải lên một ảnh để tạo video.');
            return;
        }
        setLoading(true);
        setError(null);
        setVideoUrl(null);
        setProgress(0);
        setLoadingMessage('Bắt đầu quá trình tạo video...');

        const estimatedDuration = 120 * 1000; // 2 minutes estimate
        const intervalStart = Date.now();
        
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - intervalStart;
            const currentProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
            setProgress(currentProgress);

            if (currentProgress < 20) setLoadingMessage('Đang gửi yêu cầu đến studio AI...');
            else if (currentProgress < 50) setLoadingMessage('AI đang khởi động máy quay...');
            else if (currentProgress < 80) setLoadingMessage('Video của bạn đang được kết xuất...');
            else setLoadingMessage('Gần xong, đang hoàn thiện chi tiết...');
        }, 1000);


        try {
            let imageInput: ImageInput | null = null;
            if (imageFile) {
                imageInput = await fileToInput(imageFile);
            }

            let operation = await startVideoGeneration(prompt, style, aspectRatio, imageInput);
            
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
                operation = await pollVideoGeneration(operation);
            }

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(98);
            setLoadingMessage("Đang tải video về máy chủ...");

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) {
                throw new Error("Không tìm thấy video trong kết quả trả về.");
            }

            if (!process.env.API_KEY) {
                throw new Error("API_KEY không được thiết lập.");
            }
            
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                throw new Error(`Không thể tải video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const objectUrl = URL.createObjectURL(videoBlob);
            setVideoUrl(objectUrl);
            
            setProgress(100);
            setLoadingMessage('Tạo video thành công!');

        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi tạo video. Vui lòng thử lại.');
            console.error(err);
        } finally {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setTimeout(() => setLoading(false), 1500);
        }
    };
    
    const handleDownloadVideo = () => {
        if (!videoUrl) return;
        const link = document.createElement('a');
        link.href = videoUrl;
        const safePrompt = prompt.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 30).trim().replace(/\s+/g, '_');
        link.download = `t-lab_video_${safePrompt || 'generated_video'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 mb-2">
                    Tạo Video Quảng Cáo Bằng AI
                </h1>
                <p className="text-lg text-slate-400">
                    Biến ý tưởng hoặc hình ảnh của bạn thành những video clip ngắn và ấn tượng.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
                {/* Left Column: Controls */}
                <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">1. Mô tả video hoặc Tải ảnh</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={imageUrl ? "Mô tả cách bạn muốn hình ảnh này chuyển động, ví dụ: 'làm cho mây bay và nước gợn sóng'" : "Mô tả video bạn muốn tạo, ví dụ: 'cận cảnh giọt nước rơi xuống mặt hồ tĩnh lặng'..."}
                            className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 resize-none mb-3"
                            rows={3}
                            disabled={loading}
                        />
                        <div
                            onClick={triggerFileSelect(imageFileInputRef)}
                            className={`w-full h-32 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-cyan-500'}`}
                        >
                            <input type="file" ref={imageFileInputRef} onChange={handleImageFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={loading}/>
                            {imageUrl ? (
                                <div className="relative w-full h-full p-2">
                                    <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-contain rounded-md" />
                                    <button onClick={handleClearImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 transition-colors z-10" aria-label="Xóa ảnh"><CloseIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <><UploadIcon className="w-10 h-10 text-slate-400 mb-2" /><p className="text-slate-300 text-sm">Tải ảnh lên (Tùy chọn)</p></>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-slate-700/50 pt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">2. Cấu hình Video</label>
                        <div className="flex items-center gap-2 flex-wrap mb-4">
                            <span className="text-sm font-medium text-slate-300 mr-2">Tỉ lệ:</span>
                            {aspectRatios.map((ratio) => <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} disabled={loading} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border ${aspectRatio === ratio.value ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}><ratio.icon className="w-4 h-4" />{ratio.label}</button>)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-300 mr-2">Phong cách:</span>
                            {videoStyles.map((s) => <button key={s} onClick={() => setStyle(s)} disabled={loading} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border ${style === s ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>{s}</button>)}
                        </div>
                    </div>
                   
                    <div className="pt-4 border-t border-slate-700/50">
                        <button onClick={handleGenerate} disabled={loading || (!prompt.trim() && !imageFile)} className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? <><LoaderIcon className="animate-spin mr-2" />Đang tạo video...</> : <><SparklesIcon className="mr-2" />Tạo video</>}
                        </button>
                    </div>

                    {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                </div>
                
                {/* Right Column: Results */}
                <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4 self-start">Kết quả</h2>
                    <div className="w-full flex-grow flex items-center justify-center">
                        {loading && <div className={`w-full flex items-center justify-center ${getAspectRatioClass(aspectRatio)}`}><ProgressBar progress={progress} statusText={loadingMessage} accentColor="cyan" /></div>}
                        {videoUrl && !loading && (
                            <div className="w-full flex flex-col items-center gap-4">
                                <div className={`bg-slate-900/50 p-2 rounded-xl shadow-inner w-full ${getAspectRatioClass(aspectRatio)}`}>
                                    <video ref={videoRef} src={videoUrl} controls autoPlay loop muted className="w-full h-full object-contain rounded-lg shadow-2xl" />
                                </div>
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button onClick={handleDownloadVideo} className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-5 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-green-500/30" aria-label="Lưu video đã tạo"><DownloadIcon className="w-5 h-5" />Lưu Video</button>
                                </div>
                            </div>
                        )}
                        {!videoUrl && !loading && (
                            <div className={`w-full flex flex-col items-center justify-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl p-8 ${getAspectRatioClass(aspectRatio)}`}>
                                <VideoIcon className="w-16 h-16 text-slate-500 mb-4" />
                                <p className="text-slate-500">Video được tạo sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoGenerator;