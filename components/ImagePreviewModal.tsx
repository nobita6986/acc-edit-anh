import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadIcon, EyeIcon } from './Icons';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onDownload: (() => void) | null;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, onDownload }) => {
  if (!imageUrl) return null;

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 max-w-4xl w-full flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 text-center flex items-center justify-center gap-3">
              <EyeIcon />
              Xem trước ảnh
            </h2>
            <div className="relative w-full max-h-[70vh] flex items-center justify-center bg-slate-900/50 rounded-lg p-2">
                <img src={imageUrl} alt="Xem trước ảnh" className="max-w-full max-h-full object-contain rounded-md" />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
               <button
                  onClick={handleDownloadClick}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-3 px-8 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-green-500/30 text-lg w-full sm:w-auto"
                >
                  <DownloadIcon className="w-6 h-6" />
                  Tải về
                </button>
               <button
                  onClick={onClose}
                  className="w-full sm:w-auto bg-slate-700 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-600 transition-colors duration-200"
                >
                  Đóng
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreviewModal;
