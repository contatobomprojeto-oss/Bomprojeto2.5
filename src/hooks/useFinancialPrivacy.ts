import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'bomprojeto_hide_financials';

// Estado global em memória inicializado pelo localStorage
let currentHideFinancials: boolean = (() => {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
  } catch {
    // Ignora erro de leitura do localStorage
  }
  return false;
})();

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): boolean {
  return currentHideFinancials;
}

function getServerSnapshot(): boolean {
  return false;
}

function emitChange() {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Ignora erro em listener
    }
  });
}

// Sincronização entre abas do navegador via StorageEvent
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const next = e.newValue === 'true';
      if (next !== currentHideFinancials) {
        currentHideFinancials = next;
        emitChange();
      }
    }
  });
}

/**
 * Define explicitamente o estado de ocultação de valores financeiros.
 */
export function setFinancialPrivacy(next: boolean) {
  if (currentHideFinancials !== next) {
    currentHideFinancials = next;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
    } catch {
      // Ignora erro de gravação no localStorage
    }
    emitChange();
  }
}

/**
 * Alterna entre ocultar e mostrar dados financeiros.
 */
export function toggleFinancialPrivacy() {
  setFinancialPrivacy(!currentHideFinancials);
}

/**
 * Hook oficial para gerenciamento da privacidade de dados financeiros (Efeito Blur/Borrão).
 * Utiliza useSyncExternalStore do React 19 para sincronização atômica, livre de erros de
 * renderização concorrente e com persistência automática no localStorage.
 */
export function useFinancialPrivacy() {
  const hideFinancials = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    toggleFinancialPrivacy();
  }, []);

  const setHide = useCallback((val: boolean) => {
    setFinancialPrivacy(val);
  }, []);

  return {
    hideFinancials,
    toggleHideFinancials: toggle,
    setHideFinancials: setHide,
    // Classe CSS para aplicar o efeito blur com transição suave e impedir seleção de texto
    blurClass: hideFinancials ? 'filter blur-[7px] select-none transition-all duration-200' : 'transition-all duration-200'
  };
}
