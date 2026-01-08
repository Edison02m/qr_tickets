import { useState, useCallback } from 'react';
import React from 'react';
import Dialog from '../components/common/Dialog';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  icon?: 'success' | 'error' | 'warning' | 'question' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'alert' | 'confirm';
}

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = useCallback((
    message: string,
    title: string = 'Mensaje',
    icon?: 'success' | 'error' | 'warning' | 'info'
  ) => {
    return new Promise<void>((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        icon,
        type: 'alert',
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  }, []);

  const showConfirm = useCallback((
    message: string,
    title: string = '', // Sin título por defecto, el icono de pregunta es suficiente
    confirmLabel: string = 'Aceptar',
    cancelLabel: string = 'Cancelar'
  ) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        icon: 'question',
        type: 'confirm',
        confirmLabel,
        cancelLabel,
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const showSuccess = useCallback((message: string, title: string = '') => {
    return showAlert(message, title, 'success');
  }, [showAlert]);

  const showError = useCallback((message: string, title: string = '') => {
    return showAlert(message, title, 'error');
  }, [showAlert]);

  const showWarning = useCallback((message: string, title: string = '') => {
    return showAlert(message, title, 'warning');
  }, [showAlert]);

  const showInfo = useCallback((message: string, title: string = '') => {
    return showAlert(message, title, 'info');
  }, [showAlert]);

  const DialogComponent = useCallback(() => {
    if (!dialogState.isOpen) return null;

    const buttons = dialogState.type === 'confirm'
      ? [
          {
            label: dialogState.cancelLabel || 'Cancelar',
            variant: 'secondary' as const,
            onClick: dialogState.onCancel || (() => {})
          },
          {
            label: dialogState.confirmLabel || 'Aceptar',
            variant: 'primary' as const,
            onClick: dialogState.onConfirm || (() => {})
          }
        ]
      : [
          {
            label: 'OK',
            variant: 'primary' as const,
            onClick: dialogState.onConfirm || (() => {})
          }
        ];

    return (
      <Dialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        icon={dialogState.icon}
        buttons={buttons}
        onClose={dialogState.onCancel || dialogState.onConfirm}
      />
    );
  }, [dialogState]);

  return {
    showAlert,
    showConfirm,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    DialogComponent
  };
};
