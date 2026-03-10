






import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
// Fix: Import missing functions and types from geminiService
import { generateVideoScript, generateImageForScene, generateAdCopyFromScript, VideoScript, AspectRatio, generatePromptFromImage, BilingualPrompt, translateTextToEnglish } from '../services/geminiService';
import { BoxIcon, FileTextIcon, LoaderIcon, SparklesIcon, CopyIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, DownloadIcon, MagicWandIcon, RefreshCwIcon, SpeakerIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
//- Fix: Corrected import path
import { useLanguage } from '../i18n';

type UploadBoxProps = {
  Icon: React.FC<{className?: string}>;
  title: string;
  imageUrl: string | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  accentColor: string;
  disabled?: boolean;
};

interface VideoIdeaGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
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
    document.getElementById(`file-input-${title}`)?.click();
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
          id={`file-input-${title}`}
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

const industries = ["Mỹ phẩm", "Thời trang", "Đồ ăn & Thức uống", "Công nghệ", "Gia dụng", "Du lịch", "Giáo dục"];
const brandTones = ["Ấm áp & Thân thiện", "Sang trọng & Cao cấp", "Năng động & Trẻ trung", "Hài hước & Vui vẻ", "Chuyên nghiệp & Đáng tin cậy"];
const durations = ["1-2 cảnh", "3-4 cảnh", "5-6 cảnh"];
const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '16:9', label: 'common.wide', icon: AspectRatioWideIcon },
  { value: '9:16', label: 'common.tall', icon: AspectRatioTallIcon },
  { value: '1:1', label: 'common.square', icon: AspectRatioSquareIcon },
];
const getAspectRatioClass = (ratio: AspectRatio) => {
  switch (ratio) {
    case '16:9': return 'aspect-[16/9]';
    case '9:16': return 'aspect-[9/16]';
    case '1:1': default: return 'aspect-square';
  }
};


const LOCAL_STORAGE_KEY = 'tlab-VideoIdeaGenerator-state';
const TTS_VOICE_KEY = 'tlab-tts-voiceURI';

const VideoIdeaGenerator: React.FC<VideoIdeaGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing }) => {
    const { t } = useLanguage();
    // Image states
    const [productImage, setProductImage] = useState<string | null>(null);
    const [detailImage1, setDetailImage1] = useState<string | null>(null);
    const [detailImage2, setDetailImage2] = useState<string | null>(null);
    // Form states
    const [productName, setProductName] = useState('');
    const [productInfo, setProductInfo] = useState('');
    const [industry, setIndustry] = useState(industries[0]);
    const [brandTone, setBrandTone] = useState(brandTones[0]);
    const [targetAudience, setTargetAudience] = useState('');
    const [duration, setDuration] = useState(durations[1]);
    const [cta, setCta] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    // Result states
    const [script, setScript] = useState<VideoScript | null>(null);
    const [adCopy, setAdCopy] = useState<string | null>(null);
    const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedScript, setCopiedScript] = useState(false);
    const [copiedAdCopy, setCopiedAdCopy] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [progress, setProgress] = useState(0);

    // TTS states
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
    const [speakingScene, setSpeakingScene] = useState<number | null>(null);
    
    // States for scene-specific prompt generation
    const [generatingPrompts, setGeneratingPrompts] = useState<{ [key: number]: boolean }>({});
    const [generatedPrompts, setGeneratedPrompts] = useState<{ [key: number]: BilingualPrompt | null }>({});
    const [copiedPrompts, setCopiedPrompts] = useState<{ [key: number]: boolean }>({});
    
    // States for scene-specific visuals copy
    const [copiedVisuals, setCopiedVisuals] = useState<{ [key: number]: boolean }>({});
    const [retryingScene, setRetryingScene] = useState<number | null>(null);

    const trialEnded = isTrial && trialCreations <= 0;

    // FIX: Explicitly typed the reduce accumulator to prevent type inference issues.
    const groupedVoices = voices.reduce((acc: Record<string, SpeechSynthesisVoice[]>, voice) => {
        const lang = voice.lang;
        if (!acc[lang]) {
            acc[lang] = [];
        }
        acc[lang].push(voice);
        return acc;
    }, {} as Record<string, SpeechSynthesisVoice[]>);

    // Prioritize Vietnamese voices at the top
    const sortedGroupedVoices = Object.entries(groupedVoices).sort(([langA], [langB]) => {
        if (langA.startsWith('vi')) return -1;
        if (langB.startsWith('vi')) return 1;
        return langA.localeCompare(langB);
    });

    // Effect for loading saved form state
    useEffect(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            const state = JSON.parse(saved);
            setProductName(state.productName || '');
            setProductInfo(state.productInfo || '');
            setIndustry(state.industry || industries[0]);
            setBrandTone(state.brandTone || brandTones[0]);
            setTargetAudience(state.targetAudience || '');
            setDuration(state.duration || durations[1]);
            setCta(state.cta || '');
            setAspectRatio(state.aspectRatio || '16:9');
        }
    }, []);

    // Effect for saving form state
    useEffect(() => {
        const state = { productName, productInfo, industry, brandTone, targetAudience, duration, cta, aspectRatio };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }, [productName, productInfo, industry, brandTone, targetAudience, duration, cta, aspectRatio]);

    // Effect for initializing TTS voices
    useEffect(() => {
        const populateVoiceList = () => {
            const newVoices = window.speechSynthesis.getVoices();
            if (newVoices.length > 0) {
                setVoices(newVoices);
                const savedVoiceURI = localStorage.getItem(TTS_VOICE_KEY);
                const defaultVietnameseVoice = newVoices.find(v => v.lang === 'vi-VN');
                const defaultVoice = savedVoiceURI && newVoices.find(v => v.voiceURI === savedVoiceURI) 
                    ? savedVoiceURI 
                    : (defaultVietnameseVoice?.voiceURI || newVoices[0]?.voiceURI);
                
                if (defaultVoice) {
                    setSelectedVoiceURI(defaultVoice);
                }
            }
        };

        populateVoiceList();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = populateVoiceList;
        }
        
        // Cleanup on unmount
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Effect for saving selected voice
    useEffect(() => {
        if (selectedVoiceURI) {
            localStorage.setItem(TTS_VOICE_KEY, selectedVoiceURI);
        }
    }, [selectedVoiceURI]);


    const handleFileSelect = (setter: React.Dispatch<React.SetStateAction<string | null>>) => (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result as string);
        reader.readAsDataURL(file);
    };
    
    const handleGenerate = async () => {
        if (trialEnded) {
            setError('Bạn đã hết lượt tạo miễn phí. Vui lòng đăng nhập để tiếp tục.');
            return;
        }
        if (!productName || !productInfo || !targetAudience || !cta) {
            setError('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
            return;
        }

        if (isTrial) onTrialGenerate();
        
        window.speechSynthesis.cancel();
        setSpeakingScene(null);
        setLoading(true);
        setError(null);
        setScript(null);
        setAdCopy(null);
        setIsGeneratingCopy(false);
        setGenerationStatus('Đang viết kịch bản...');
        setProgress(5);
        setGeneratedPrompts({});
        setGeneratingPrompts({});
        setCopiedPrompts({});
        setCopiedVisuals({});

        try {
            const dataUrlToInput = (dataUrl: string | null) => {
                if (!dataUrl) return null;
                const [header, data] = dataUrl.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'application-octet-stream';
                return { base64: data, mimeType };
            };

            const images = [dataUrlToInput(productImage), dataUrlToInput(detailImage1), dataUrlToInput(detailImage2)];
            // Step 1: Generate text script
            const textScript = await generateVideoScript(images, productName, productInfo, industry, brandTone, targetAudience, duration, cta);
            
            setProgress(20);
            
            // Initialize script with loading placeholders for images
            const initialScriptWithPlaceholders: VideoScript = {
                ...textScript,
                scenes: textScript.scenes.map(scene => ({ ...scene, imageUrl: 'loading' }))
            };
            setScript(initialScriptWithPlaceholders);
            setLoading(false); // Script is loaded, now start image/ad copy generation

            // Step 2: Generate Ad Copy
            setIsGeneratingCopy(true);
            setGenerationStatus('Đang viết nội dung quảng cáo...');
            generateAdCopyFromScript(textScript)
                .then(generatedCopy => setAdCopy(generatedCopy))
                .catch(e => {
                    console.error("Failed to generate ad copy:", e);
                    setAdCopy("Không thể tạo nội dung quảng cáo.");
                })
                .finally(() => {
                    setIsGeneratingCopy(false);
                    setProgress(30);
                });


            // Step 3: Generate images for each scene in parallel with progress updates
            const productImageInput = dataUrlToInput(productImage);
            const totalScenes = textScript.scenes.length;
            const progressStart = 30;
            const progressEnd = 95;
            const progressRange = progressEnd - progressStart;
            let scenesCompleted = 0;

            setGenerationStatus(`(${progressStart}%) Chuẩn bị sáng tạo hình ảnh cho ${totalScenes} cảnh...`);
            setProgress(progressStart);

            const updateProgress = () => {
                scenesCompleted++;
                const currentProgress = progressStart + (scenesCompleted / totalScenes) * progressRange;
                setProgress(currentProgress);
                setGenerationStatus(`(${Math.round(currentProgress)}%) Đã tạo ${scenesCompleted}/${totalScenes} ảnh...`);
            };

            const imagePromises = textScript.scenes.map(scene =>
                generateImageForScene(scene.visuals, brandTone, productName, productImageInput, aspectRatio)
                    .finally(updateProgress)
            );
        
            const imageResults = await Promise.allSettled(imagePromises);
        
            setGenerationStatus('Hoàn thiện storyboard...');
        
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                imageResults.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        newScenes[index].imageUrl = result.value;
                    } else {
                        console.error(`Failed to generate image for scene ${index + 1}:`, result.reason);
                        newScenes[index].imageUrl = 'failed';
                    }
                });
                return { ...currentScript, scenes: newScenes };
            });

            setProgress(100);
            setGenerationStatus('Hoàn tất!');
            setTimeout(() => setGenerationStatus(''), 2000);


        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi tạo ý tưởng. Vui lòng thử lại.');
            setLoading(false);
            setGenerationStatus('');
            setProgress(0);
        }
    };
    
    const handleRetrySceneImage = async (sceneIndex: number) => {
        if (!script) return;
        
        const RETRY_COST = 1;

        if (isTrial && trialCreations < RETRY_COST) {
            setError(`Bạn cần ít nhất ${RETRY_COST} lượt tạo để thử lại. Vui lòng đăng nhập.`);
            return;
        }
        if (isTrial) {
            onTrialGenerate(RETRY_COST);
        }
        
        setRetryingScene(sceneIndex);
        setError(null);
        
        try {
            const scene = script.scenes[sceneIndex];
            const productImageInput = productImage ? { base64: productImage.split(',')[1], mimeType: productImage.match(/:(.*?);/)?.[1] || 'image/png' } : null;
            
            const imageUrl = await generateImageForScene(scene.visuals, brandTone, productName, productImageInput, aspectRatio);
            
            setScript(currentScript => {
                if (!currentScript) return null;
                const newScenes = [...currentScript.scenes];
                newScenes[sceneIndex].imageUrl = imageUrl;
                return { ...currentScript, scenes: newScenes };
            });
        } catch (e: any) {
            setError(e.message || `Không thể tạo lại ảnh cho cảnh ${sceneIndex + 1}.`);
        } finally {
            setRetryingScene(null);
        }
    };
    
    const handleCopyScript = () => {
        if (!script) return;
        let scriptText = `Tiêu đề: ${script.title}\n\n`;
        scriptText += `Tóm tắt: ${script.summary}\n\n`;
        script.scenes.forEach(scene => {
            scriptText += `--- CẢNH ${scene.scene_number} ---\n`;
            scriptText += `HÌNH ẢNH: ${scene.visuals}\n`;
            scriptText += `LỜI THOẠI: ${scene.voiceover}\n\n`;
        });
        navigator.clipboard.writeText(scriptText);
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2000);
    };
    
    const handleCopyAdCopy = () => {
        if (!adCopy) return;
        navigator.clipboard.writeText(adCopy);
        setCopiedAdCopy(true);
        setTimeout(() => setCopiedAdCopy(false), 2000);
    };

    const handleDownloadSceneImage = (imageUrl: string, sceneNumber: number) => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        const safeProductName = productName.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 20).trim().replace(/\s+/g, '_');
        link.download = `t-lab_storyboard_${safeProductName || 'idea'}_scene_${sceneNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleGeneratePromptForScene = async (imageUrl: string, sceneNumber: number) => {
        if (!imageUrl) return;
        setGeneratingPrompts(prev => ({ ...prev, [sceneNumber]: true }));
        setError(null);
        try {
            const [header, data] = imageUrl.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            const promptObject = await generatePromptFromImage(data, mimeType);
            setGeneratedPrompts(prev => ({ ...prev, [sceneNumber]: promptObject }));
        } catch (err: any) {
           setError(err.message || `Không thể tạo prompt cho cảnh ${sceneNumber}.`);
           console.error(err);
        } finally {
            setGeneratingPrompts(prev => ({ ...prev, [sceneNumber]: false }));
        }
    };
    
    const handleCopyScenePrompt = (promptObject: BilingualPrompt, sceneNumber: number) => {
        navigator.clipboard.writeText(promptObject.en);
        setCopiedPrompts(prev => ({ ...prev, [sceneNumber]: true }));
        setTimeout(() => {
            setCopiedPrompts(prev => ({ ...prev, [sceneNumber]: false }));
        }, 2000);
    };
    
    const handleCopyVisuals = (visuals: string, sceneNumber: number) => {
        navigator.clipboard.writeText(visuals);
        setCopiedVisuals(prev => ({ ...prev, [sceneNumber]: true }));
        setTimeout(() => {
            setCopiedVisuals(prev => ({ ...prev, [sceneNumber]: false }));
        }, 2000);
    };
    
    const handleSpeak = (text: string, sceneNumber: number) => {
        if (speakingScene === sceneNumber) {
            window.speechSynthesis.cancel();
            setSpeakingScene(null);
            return;
        }

        window.speechSynthesis.cancel(); // Stop any currently playing speech

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        utterance.onstart = () => {
            setSpeakingScene(sceneNumber);
        };

        utterance.onend = () => {
            setSpeakingScene(null);
        };
        
        utterance.onerror = () => {
            setSpeakingScene(null);
        };

        window.speechSynthesis.speak(utterance);
    };

    const isGenerating = loading || !!generationStatus;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 mb-2">
          {t('videoIdea.title')}
        </h1>
        <p className="text-lg text-slate-400">
          {t('videoIdea.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Left: Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-4">
            {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
            
            <div className="grid grid-cols-3 gap-4">
                <UploadBox Icon={BoxIcon} title={t('videoIdea.uploadProduct')} imageUrl={productImage} onFileSelect={handleFileSelect(setProductImage)} onClear={() => setProductImage(null)} accentColor="amber" disabled={trialEnded || isGenerating} />
                <UploadBox Icon={FileTextIcon} title={t('videoIdea.uploadBack')} imageUrl={detailImage1} onFileSelect={handleFileSelect(setDetailImage1)} onClear={() => setDetailImage1(null)} accentColor="amber" disabled={trialEnded || isGenerating} />
                <UploadBox Icon={FileTextIcon} title={t('videoIdea.uploadDetail')} imageUrl={detailImage2} onFileSelect={handleFileSelect(setDetailImage2)} onClear={() => setDetailImage2(null)} accentColor="amber" disabled={trialEnded || isGenerating} />
            </div>

            <div className="space-y-4">
                <InputField label={t('videoIdea.productNameLabel')} placeholder={t('videoIdea.productNamePlaceholder')} value={productName} onChange={e => setProductName(e.target.value)} disabled={trialEnded || isGenerating} />
                <TextAreaField label={t('videoIdea.productInfoLabel')} placeholder={t('videoIdea.productInfoPlaceholder')} value={productInfo} onChange={e => setProductInfo(e.target.value)} disabled={trialEnded || isGenerating} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label={t('videoIdea.industryLabel')} value={industry} onChange={e => setIndustry(e.target.value)} optionValues={industries} disabled={trialEnded || isGenerating}/>
                    <SelectField label={t('videoIdea.brandToneLabel')} value={brandTone} onChange={e => setBrandTone(e.target.value)} optionValues={brandTones} disabled={trialEnded || isGenerating}/>
                </div>
                 <InputField label={t('videoIdea.audienceLabel')} placeholder={t('videoIdea.audiencePlaceholder')} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} disabled={trialEnded || isGenerating} />
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectField label={t('videoIdea.durationLabel')} value={duration} onChange={e => setDuration(e.target.value)} optionValues={durations} disabled={trialEnded || isGenerating} />
                    <InputField label={t('videoIdea.ctaLabel')} placeholder={t('videoIdea.ctaPlaceholder')} value={cta} onChange={e => setCta(e.target.value)} disabled={trialEnded || isGenerating} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('videoIdea.ratioLabel')}</label>
                     <div className="flex items-center gap-2 flex-wrap">
                        {aspectRatios.map((ratio) => {
                            const Icon = ratio.icon;
                            return (
                                <button key={ratio.value} onClick={() => setAspectRatio(ratio.value)} disabled={trialEnded || isGenerating}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border
                                    ${aspectRatio === ratio.value ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'}`}>
                                    <Icon className="w-4 h-4" />{t(ratio.label)}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-700/50">
                {isGenerating && (
                    <div className="mb-4">
                        <p className="text-sm text-center text-amber-300 mb-2">{generationStatus}</p>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                    {isGenerating ? <><LoaderIcon className="animate-spin mr-3" />{t('videoIdea.generatingButton')}</> : <><SparklesIcon className="mr-3" />{t('videoIdea.generateButton')}</>}
                </button>
            </div>
            {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>

        {/* Right: Results */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col min-h-[500px]">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">{t('videoIdea.resultsTitle')}</h2>
                {script && !isGenerating && (
                    <button onClick={handleCopyScript} className="flex items-center gap-2 text-sm text-cyan-300 bg-cyan-900/50 px-3 py-1.5 rounded-md hover:bg-cyan-800/50 transition-colors">
                        <CopyIcon className="w-4 h-4" />
                        {copiedScript ? t('videoIdea.copiedScriptButton') : t('videoIdea.copyScriptButton')}
                    </button>
                )}
             </div>
             <div className="w-full flex-grow flex items-center justify-center bg-slate-900/50 rounded-lg border border-dashed border-slate-600 p-4 overflow-y-auto">
                {loading && (
                    <div className="text-center text-slate-400">
                        <LoaderIcon className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                        <p>AI đang brainstorm ý tưởng...</p>
                    </div>
                )}
                {!loading && script && (
                     <div className="text-slate-300 w-full h-full space-y-4">
                        <div>
                            <h3 className="text-lg font-bold text-amber-300">{script.title}</h3>
                            <p className="text-sm italic text-slate-400 mt-1">{script.summary}</p>
                        </div>

                        {(isGeneratingCopy || adCopy) && (
                            <div className="bg-slate-800/50 p-3 rounded-md border-l-2 border-cyan-400">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-cyan-300">{t('videoIdea.adCopyTitle')}</h4>
                                    {adCopy && !isGeneratingCopy && (
                                        <button onClick={handleCopyAdCopy} className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-md hover:bg-cyan-800/50 transition-colors">
                                            <CopyIcon className="w-3 h-3" />
                                            {copiedAdCopy ? t('videoIdea.copiedAdCopyButton') : t('videoIdea.copyAdCopyButton')}
                                        </button>
                                    )}
                                </div>
                                {isGeneratingCopy ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <LoaderIcon className="w-4 h-4 animate-spin" />
                                        <span>{t('videoIdea.generatingAdCopy')}</span>
                                    </div>
                                ) : (
                                    <p className="text-sm whitespace-pre-wrap">{adCopy}</p>
                                )}
                            </div>
                        )}
                        
                        {voices.length > 0 && (
                            <div className="bg-slate-800/50 p-3 rounded-md border-l-2 border-fuchsia-400">
                                <label htmlFor="voice-select" className="block text-sm font-semibold text-fuchsia-300 mb-2">{t('videoIdea.audioPreviewTitle')}</label>
                                <select
                                    id="voice-select"
                                    value={selectedVoiceURI || ''}
                                    onChange={e => setSelectedVoiceURI(e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-xs text-slate-200 focus:ring-1 focus:ring-fuchsia-400 focus:border-fuchsia-400"
                                >
                                    {sortedGroupedVoices.map(([lang, voicesInGroup]) => (
                                        <optgroup key={lang} label={lang.startsWith('vi') ? `Tiếng Việt (${lang})` : lang}>
                                            {voicesInGroup.map(voice => (
                                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                                    {voice.name}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-4 pr-2">
                        {script.scenes.map((scene, index) => (
                            <div key={scene.scene_number} className="bg-slate-800/50 p-3 rounded-md border-l-2 border-amber-400 flex flex-col sm:flex-row gap-4">
                               <div className={`flex-shrink-0 w-full sm:w-48 bg-slate-900 rounded-md flex items-center justify-center ${getAspectRatioClass(aspectRatio)}`}>
                                   {scene.imageUrl === 'loading' && <LoaderIcon className="w-8 h-8 text-amber-500 animate-spin" />}
                                   {scene.imageUrl === 'failed' && (
                                    <div className="text-center text-red-400 text-xs p-2 flex flex-col gap-2">
                                        <span>{t('videoIdea.imageGenError')}</span>
                                        <button 
                                            onClick={() => handleRetrySceneImage(index)} 
                                            disabled={retryingScene === index}
                                            className="flex items-center justify-center gap-1 bg-red-800/80 hover:bg-red-700 text-white font-semibold py-1 px-2 rounded-md transition-colors disabled:opacity-50"
                                        >
                                           {retryingScene === index ? <LoaderIcon className="w-3.5 h-3.5 animate-spin"/> : <RefreshCwIcon className="w-3.5 h-3.5" />}
                                           {t('common.retry')}
                                        </button>
                                    </div>
                                   )}
                                   {scene.imageUrl && scene.imageUrl !== 'loading' && scene.imageUrl !== 'failed' && (
                                       <img src={`${scene.imageUrl}`} alt={`${t('videoIdea.sceneTitle')} ${scene.scene_number}`} className="w-full h-full object-cover rounded-md" />
                                   )}
                               </div>
                               <div className="text-sm flex-grow">
                                    <h4 className="font-semibold text-amber-400">{t('videoIdea.sceneTitle')} {scene.scene_number}</h4>
                                    <div className="mt-1">
                                        <strong className="text-slate-400">{t('videoIdea.visualsLabel')}</strong>
                                        <p className="inline ml-1">{scene.visuals}</p>
                                        <button
                                            onClick={() => handleCopyVisuals(scene.visuals, scene.scene_number)}
                                            className="flex items-center gap-1.5 mt-1.5 text-xs text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-md hover:bg-cyan-800/50 transition-colors"
                                        >
                                            <CopyIcon className="w-3 h-3" />
                                            {copiedVisuals[scene.scene_number] ? t('videoIdea.copiedPromptVisuals') : t('videoIdea.copyPromptVisuals')}
                                        </button>
                                    </div>
                                    <div className="mt-1">
                                        <strong className="text-slate-400">{t('videoIdea.voiceoverLabel')}</strong>
                                        <p className="inline ml-1">{scene.voiceover}</p>
                                         <button
                                            onClick={() => handleSpeak(scene.voiceover, scene.scene_number)}
                                            title={t('videoIdea.listenButton')}
                                            className={`ml-2 p-1 rounded-full transition-colors ${speakingScene === scene.scene_number ? 'bg-fuchsia-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-fuchsia-600/50'}`}
                                         >
                                             <SpeakerIcon className="w-3 h-3"/>
                                         </button>
                                    </div>
                                    
                                    {scene.imageUrl && scene.imageUrl !== 'loading' && scene.imageUrl !== 'failed' && (
                                        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => handleDownloadSceneImage(scene.imageUrl as string, scene.scene_number)}
                                                    className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-md transition-all duration-200 bg-green-600/80 hover:bg-green-500 text-white"
                                                >
                                                    <DownloadIcon className="w-3.5 h-3.5" />
                                                    {t('common.save')}
                                                </button>
                                                <button
                                                    onClick={() => handleGeneratePromptForScene(scene.imageUrl as string, scene.scene_number)}
                                                    disabled={generatingPrompts[scene.scene_number]}
                                                    className="flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-md transition-all duration-200 bg-purple-600/80 hover:bg-purple-500 text-white disabled:opacity-50"
                                                >
                                                    {generatingPrompts[scene.scene_number] ? <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> : <MagicWandIcon className="w-3.5 h-3.5" />}
                                                    {generatingPrompts[scene.scene_number] ? (t('common.generating') + '...') : t('textToImage.generateVideoPrompt')}
                                                </button>
                                            </div>
                                            {generatedPrompts[scene.scene_number] && (
                                                <div className="bg-slate-900/50 p-2 rounded-md text-xs">
                                                    <p className="text-slate-300 italic">"{generatedPrompts[scene.scene_number]?.vi}"</p>
                                                    <button
                                                        onClick={() => handleCopyScenePrompt(generatedPrompts[scene.scene_number]!, scene.scene_number)}
                                                        className="flex items-center gap-1.5 mt-1 text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-md hover:bg-cyan-800/50 transition-colors"
                                                    >
                                                        <CopyIcon className="w-3 h-3" />
                                                        {copiedPrompts[scene.scene_number] ? t('common.copiedPromptEn') : t('common.copyPromptEn')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                               </div>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
                {!loading && !script && (
                     <div className="text-center text-slate-500">
                        <SparklesIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>{t('videoIdea.resultsPlaceholderTitle')}</p>
                    </div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for form fields
const InputField = (props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => {
    const { label, ...rest } = props;
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <input {...rest} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm disabled:opacity-50" />
        </div>
    );
};
const TextAreaField = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => {
    const { label, ...rest } = props;
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <textarea {...rest} rows={3} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm resize-none disabled:opacity-50" />
        </div>
    );
};
// Fix: Renamed 'options' prop to 'optionValues' to avoid conflict with HTMLSelectElement.options
const SelectField = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; optionValues: string[] }) => {
    const { label, optionValues, ...rest } = props;
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <select {...rest} className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm disabled:opacity-50">
                {/* Fix: Added an Array.isArray check to prevent runtime errors if optionValues is not an array, addressing the 'map does not exist' error. */}
                {Array.isArray(optionValues) && optionValues.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
};


export default VideoIdeaGenerator;