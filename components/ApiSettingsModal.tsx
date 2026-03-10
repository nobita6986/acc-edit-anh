import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CloseIcon, TrashIcon } from './Icons';
import { GoogleGenAI } from '@google/genai';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const imageModels = [
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image Preview' },
  { id: 'imagen-4.0-generate-001', name: 'Imagen 4.0' },
];

const textModels = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-3.1-flash-preview', name: 'Gemini 3.1 Flash Preview' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
];

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [activeKey, setActiveKey] = useState<string>('');
  const [newKey, setNewKey] = useState('');
  const [checkingKey, setCheckingKey] = useState<string | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<string, 'valid' | 'invalid'>>({});
  
  const [selectedImageModel, setSelectedImageModel] = useState('gemini-2.5-flash-image');
  const [selectedTextModel, setSelectedTextModel] = useState('gemini-2.5-flash');

  useEffect(() => {
    const savedKeys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
    const savedActiveKey = localStorage.getItem('custom_gemini_api_key') || '';
    const savedImageModel = localStorage.getItem('custom_gemini_image_model') || 'gemini-2.5-flash-image';
    const savedTextModel = localStorage.getItem('custom_gemini_text_model') || 'gemini-2.5-flash';

    setApiKeys(savedKeys);
    setActiveKey(savedActiveKey);
    setSelectedImageModel(savedImageModel);
    setSelectedTextModel(savedTextModel);
  }, [isOpen]);

  const handleAddKey = () => {
    if (newKey.trim() && !apiKeys.includes(newKey.trim())) {
      const updatedKeys = [...apiKeys, newKey.trim()];
      setApiKeys(updatedKeys);
      localStorage.setItem('gemini_api_keys', JSON.stringify(updatedKeys));
      if (!activeKey) {
        handleSetActiveKey(newKey.trim());
      }
      setNewKey('');
    }
  };

  const handleRemoveKey = (keyToRemove: string) => {
    const updatedKeys = apiKeys.filter(k => k !== keyToRemove);
    setApiKeys(updatedKeys);
    localStorage.setItem('gemini_api_keys', JSON.stringify(updatedKeys));
    if (activeKey === keyToRemove) {
      handleSetActiveKey(updatedKeys.length > 0 ? updatedKeys[0] : '');
    }
  };

  const handleSetActiveKey = (key: string) => {
    setActiveKey(key);
    if (key) {
      localStorage.setItem('custom_gemini_api_key', key);
    } else {
      localStorage.removeItem('custom_gemini_api_key');
    }
    window.dispatchEvent(new Event('api_key_changed'));
  };

  const handleCheckKey = async (key: string) => {
    setCheckingKey(key);
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'hi',
      });
      setKeyStatus(prev => ({ ...prev, [key]: 'valid' }));
    } catch (error) {
      console.error(error);
      setKeyStatus(prev => ({ ...prev, [key]: 'invalid' }));
    } finally {
      setCheckingKey(null);
    }
  };

  const handleImageModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedImageModel(val);
    localStorage.setItem('custom_gemini_image_model', val);
  };

  const handleTextModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTextModel(val);
    localStorage.setItem('custom_gemini_text_model', val);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Cài đặt API & Model</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* API Keys Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-sky-400">Quản lý API Keys</h3>
            
            <div className="flex gap-2">
              <input
                type="password"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Nhập Gemini API Key mới..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleAddKey}
                disabled={!newKey.trim()}
                className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Thêm
              </button>
            </div>

            <div className="space-y-2 mt-4">
              {apiKeys.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Chưa có API key nào được thêm. Sẽ sử dụng key mặc định của hệ thống.</p>
              ) : (
                apiKeys.map((key, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${activeKey === key ? 'border-sky-500 bg-sky-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <input
                        type="radio"
                        name="activeApiKey"
                        checked={activeKey === key}
                        onChange={() => handleSetActiveKey(key)}
                        className="w-4 h-4 text-sky-500 bg-slate-900 border-slate-600 focus:ring-sky-500"
                      />
                      <span className="font-mono text-sm text-slate-300 truncate">
                        {key.substring(0, 8)}...{key.substring(key.length - 4)}
                      </span>
                      {keyStatus[key] === 'valid' && <span className="text-emerald-400 text-xs font-medium px-2 py-1 bg-emerald-400/10 rounded-full">Hợp lệ</span>}
                      {keyStatus[key] === 'invalid' && <span className="text-rose-400 text-xs font-medium px-2 py-1 bg-rose-400/10 rounded-full">Không hợp lệ</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheckKey(key)}
                        disabled={checkingKey === key}
                        className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors disabled:opacity-50"
                      >
                        {checkingKey === key ? 'Đang kiểm tra...' : 'Kiểm tra'}
                      </button>
                      <button
                        onClick={() => handleRemoveKey(key)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <hr className="border-slate-700" />

          {/* Models Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-fuchsia-400">Chọn Model</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Model Xử lý Ảnh</label>
                <select
                  value={selectedImageModel}
                  onChange={handleImageModelChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-fuchsia-500"
                >
                  {imageModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Model Xử lý Văn bản</label>
                <select
                  value={selectedTextModel}
                  onChange={handleTextModelChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-fuchsia-500"
                >
                  {textModels.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Lưu ý: Một số model cao cấp (như Imagen 4.0, Gemini 3.1 Pro) yêu cầu API key có quyền truy cập tương ứng.
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ApiSettingsModal;
