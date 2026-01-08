import React, { useEffect } from 'react';

interface DialogButton {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
}

interface DialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: 'success' | 'error' | 'warning' | 'question' | 'info';
  buttons: DialogButton[];
  onClose?: () => void;
}

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  message,
  icon,
  buttons,
  onClose
}) => {
  // Bloquear scroll cuando el diálogo está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIconElement = () => {
    const iconSize = "h-4 w-4"; // Iconos muy pequeños
    const containerSize = "h-7 w-7"; // Contenedor compacto
    
    switch (icon) {
      case 'success':
        return (
          <div className={`inline-flex items-center justify-center ${containerSize} rounded-full bg-green-100`}>
            <svg className={`${iconSize} text-green-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className={`inline-flex items-center justify-center ${containerSize} rounded-full bg-red-100`}>
            <svg className={`${iconSize} text-red-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className={`inline-flex items-center justify-center ${containerSize} rounded-full bg-amber-100`}>
            <svg className={`${iconSize} text-amber-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'question':
        return (
          <div className={`inline-flex items-center justify-center ${containerSize} rounded-full bg-blue-100`}>
            <svg className={`${iconSize} text-blue-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className={`inline-flex items-center justify-center ${containerSize} rounded-full bg-blue-100`}>
            <svg className={`${iconSize} text-blue-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getButtonStyles = (variant?: 'primary' | 'secondary' | 'danger') => {
    switch (variant) {
      case 'primary':
        return 'bg-[#1D324D] text-white hover:bg-[#457373] active:bg-[#1D324D]/90';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800';
      case 'secondary':
      default:
        return 'bg-white text-[#1D324D] hover:bg-gray-50 active:bg-gray-100 border border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop con blur minimalista */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Contenedor centrado */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Dialog ultra compacto */}
        <div 
          className="relative transform overflow-hidden rounded-xl bg-white shadow-xl transition-all duration-200 ease-out w-full max-w-[400px]"
          style={{
            animation: 'dialogSlideIn 0.2s ease-out'
          }}
        >
          {/* Contenido del diálogo - compacto y minimalista */}
          <div className="px-5 py-4">
            {/* Solo icono y mensaje, SIN título redundante */}
            <div className="flex gap-3">
              {icon && getIconElement()}
              <div className="flex-1 min-w-0">
                {/* Título solo si es diferente del tipo de icono */}
                {title && (
                  <h3 className="text-base font-semibold text-[#1D324D] mb-1.5 tracking-tight">
                    {title}
                  </h3>
                )}
                {/* Mensaje */}
                <p className="text-sm text-[#1D324D]/70 leading-relaxed whitespace-pre-line">
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Botones - muy compactos */}
          <div className={`px-5 py-3 bg-gray-50/30 flex gap-2 justify-end border-t border-gray-100`}>
            {buttons.map((button, index) => (
              <button
                key={index}
                onClick={button.onClick}
                className={`
                  px-4 py-1.5 rounded-lg font-medium text-sm
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#457373]
                  ${getButtonStyles(button.variant)}
                  min-w-[70px]
                `}
                autoFocus={button.variant === 'primary' || index === buttons.length - 1}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dialogSlideIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Dialog;
