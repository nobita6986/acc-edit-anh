import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import { generateSpeechFromText } from '../services/geminiService';
import { LoaderIcon, SparklesIcon, SpeakerIcon, DownloadIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import ProgressBar from '../components/ProgressBar';

interface TextToSpeechGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
}

const VOICES = [
  // Giọng Miền Nam
  { id: 'Kore', name: 'Giọng Nữ Miền Nam (Trưởng thành, ấm áp)' },
  { id: 'Zephyr', name: 'Giọng Nam Miền Nam (Thân thiện, rõ ràng)' },
  // Giọng Miền Bắc & Đặc Trưng
  { id: 'Puck', name: 'Giọng Nữ Miền Bắc (Trong trẻo, năng động)' },
  { id: 'Fenrir', name: 'Giọng Nam Miền Bắc (Mạnh mẽ, dứt khoát)' },
  { id: 'Charon', name: 'Giọng Ông Lão Kể chuyện (Trầm, truyền cảm)' },
];


const LOCAL_STORAGE_KEY = 'tlab-TextToSpeechGenerator-state';

// Helper to decode base64
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper to create a WAV file from raw PCM data
const createWavFile = (pcmData: Uint8Array): Blob => {
    const sampleRate = 24000;
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.byteLength, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size for PCM
    view.setUint16(20, 1, true); // AudioFormat for PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
    view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
    view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample
    
    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.byteLength, true);

    return new Blob([header, pcmData], { type: 'audio/wav' });
};


const TextToSpeechGenerator: React.FC<TextToSpeechGeneratorProps> = ({
  isTrial,
  trialCreations,
  onTrialGenerate,
  onRequireLogin,
  onRequirePricing,
}) => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const trialEnded = isTrial && trialCreations <= 0;

  useEffect(() => {
    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        if (savedState.text) setText(savedState.text);
        if (savedState.selectedVoice) setSelectedVoice(savedState.selectedVoice);
      } catch (e) {
        console.error("Failed to parse TextToSpeechGenerator state", e);
      }
    }
  }, []);

  useEffect(() => {
    const stateToSave = { text, selectedVoice };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [text, selectedVoice]);

  // Cleanup blob URL on component unmount or when a new URL is created
  useEffect(() => {
    const currentAudioUrl = audioUrl;
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }
    };
  }, [audioUrl]);


  const handleGenerate = async () => {
    if (!text.trim()) {
      setError(t('ttsGenerator.errorNoText'));
      return;
    }
    if (!selectedVoice) {
      setError(t('ttsGenerator.errorNoVoice'));
      return;
    }
    if (trialEnded) {
      setError('Bạn đã hết lượt tạo miễn phí.');
      return;
    }

    if (isTrial) onTrialGenerate();

    setLoading(true);
    setError(null);
    setAudioUrl(null);
    setProgress(0);
    setStatusText('Đang gửi yêu cầu...');

    try {
        setProgress(30);
        setStatusText('AI đang chuẩn bị giọng đọc...');
        const base64Audio = await generateSpeechFromText(text, selectedVoice);
        
        setProgress(70);
        setStatusText('Đang xử lý âm thanh...');
        const pcmData = decode(base64Audio);
        const wavBlob = createWavFile(pcmData);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);

        setProgress(100);
        setStatusText('Tạo âm thanh thành công!');
        setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
        setError(err.message || 'Lỗi khi tạo âm thanh.');
        setLoading(false);
        setProgress(0);
        setStatusText('');
    }
  };
  
  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    const safeText = text.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 20).trim().replace(/\s+/g, '_');
    link.download = `t-lab_speech_${safeText || 'audio'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500 mb-2">
          {t('ttsGenerator.title')}
        </h1>
        <p className="text-lg text-slate-400">{t('ttsGenerator.description')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Left: Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col gap-6">
          {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
          
          <div>
            <label htmlFor="tts-text" className="block text-sm font-medium text-slate-300 mb-2">{t('ttsGenerator.textLabel')}</label>
            <textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('ttsGenerator.textPlaceholder')}
              className="w-full h-48 bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 resize-y"
              disabled={loading || trialEnded}
            />
          </div>

          <div>
            <label htmlFor="tts-voice" className="block text-sm font-medium text-slate-300 mb-2">{t('ttsGenerator.voiceLabel')}</label>
            <select
              id="tts-voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={loading || trialEnded}
              className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200 disabled:opacity-50"
            >
              {VOICES.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-700/50">
            <button
              onClick={handleGenerate}
              disabled={loading || trialEnded || !text.trim()}
              className="w-full flex items-center justify-center bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? (
                <><LoaderIcon className="animate-spin mr-2" />{t('ttsGenerator.generatingButton')}</>
              ) : (
                <><SparklesIcon className="mr-2" />{t('ttsGenerator.generateButton')}</>
              )}
            </button>
            {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
          </div>
        </div>

        {/* Right: Results */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 mb-4 self-start">{t('common.results')}</h2>
          <div className="w-full flex-grow flex items-center justify-center">
            {loading && (
              <div className="w-full">
                <ProgressBar progress={progress} statusText={statusText} accentColor="cyan" />
              </div>
            )}
            {audioUrl && !loading && (
              <div className="w-full flex flex-col items-center gap-4">
                <audio controls src={audioUrl} className="w-full rounded-lg" />
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-5 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-green-500/30"
                >
                  <DownloadIcon className="w-5 h-5" />
                  {t('ttsGenerator.saveAudio')}
                </button>
              </div>
            )}
            {!audioUrl && !loading && (
              <div className="w-full h-48 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600">
                <SpeakerIcon className="w-12 h-12 mb-4" />
                <p className="text-center p-4">{t('ttsGenerator.resultsPlaceholder')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeechGenerator;