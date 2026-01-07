import React from 'react';

interface LoadingDialogProps {
  isOpen: boolean;
  message?: string;
}

const LoadingDialog: React.FC<LoadingDialogProps> = ({ isOpen, message = 'Sending to WhatsApp...' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay - blocks all interaction */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          style={{ pointerEvents: 'auto' }}
        ></div>

        {/* Dialog panel */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative">
          {/* Content */}
          <div className="flex flex-col items-center justify-center py-6">
            {/* Spinner */}
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            
            {/* Message */}
            <p className="text-gray-700 text-center text-lg font-medium">
              {message}
            </p>
            
            {/* Sub-message */}
            <p className="text-gray-500 text-center text-sm mt-2">
              Please wait while we process your request...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingDialog;

