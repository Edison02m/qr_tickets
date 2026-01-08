/**
 * Helper functions to show custom dialogs with Apple-style design
 * Replaces native alert() and confirm() with beautiful custom React dialogs
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import Dialog from '../components/common/Dialog';

// Variable para mantener referencia al contenedor del diálogo
let dialogContainer: HTMLDivElement | null = null;
let dialogRoot: any = null;

/**
 * Utility function to create and mount a dialog
 */
function mountDialog(
  title: string,
  message: string,
  icon: 'success' | 'error' | 'warning' | 'question' | 'info',
  buttons: Array<{ label: string; variant?: 'primary' | 'secondary' | 'danger'; onClick: () => void }>
): Promise<void> {
  return new Promise((resolve) => {
    // Crear contenedor si no existe
    if (!dialogContainer) {
      dialogContainer = document.createElement('div');
      dialogContainer.id = 'custom-dialog-root';
      document.body.appendChild(dialogContainer);
      dialogRoot = createRoot(dialogContainer);
    }

    const handleClose = () => {
      if (dialogRoot && dialogContainer) {
        dialogRoot.render(null);
      }
      resolve();
    };

    // Actualizar botones para incluir handleClose
    const wrappedButtons = buttons.map(btn => ({
      ...btn,
      onClick: () => {
        btn.onClick();
        handleClose();
      }
    }));

    // Renderizar el diálogo
    const dialogElement = React.createElement(Dialog, {
      isOpen: true,
      title,
      message,
      icon,
      buttons: wrappedButtons,
      onClose: handleClose
    });

    dialogRoot.render(dialogElement);
  });
}

/**
 * Shows a message dialog (replaces alert())
 * @param message - The message to display
 * @param title - Optional title for the dialog
 * @param type - Dialog type: 'success', 'info', 'error', 'warning', 'question'
 */
export async function showAlert(
  message: string,
  title?: string,
  type: 'success' | 'info' | 'error' | 'warning' | 'question' = 'info'
): Promise<void> {
  return mountDialog(
    title || '', // Sin título por defecto, el icono es suficiente
    message,
    type,
    [{ label: 'OK', variant: 'primary', onClick: () => {} }]
  );
}

/**
 * Shows a confirmation dialog (replaces confirm())
 * @param message - The question to ask
 * @param title - Optional title for the dialog
 * @returns true if user clicked "Aceptar", false if "Cancelar"
 */
export async function showConfirm(
  message: string,
  title?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    mountDialog(
      title || '', // Sin título, solo icono de pregunta
      message,
      'question',
      [
        { label: 'Cancelar', variant: 'secondary', onClick: () => resolve(false) },
        { label: 'Aceptar', variant: 'primary', onClick: () => resolve(true) }
      ]
    );
  });
}

/**
 * Shows a success message
 */
export async function showSuccess(message: string): Promise<void> {
  await showAlert(message, '', 'success'); // Sin título, solo icono verde
}

/**
 * Shows an error message
 */
export async function showError(message: string): Promise<void> {
  await showAlert(message, '', 'error'); // Sin título, solo icono rojo
}

/**
 * Shows a warning message
 */
export async function showWarning(message: string): Promise<void> {
  await showAlert(message, '', 'warning'); // Sin título, solo icono amarillo
}

/**
 * Shows an info message
 */
export async function showInfo(message: string): Promise<void> {
  await showAlert(message, '', 'info'); // Sin título, solo icono azul
}

