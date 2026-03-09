/// <reference types="vite/client" />
interface Window {
    toast: (message: string, type?: 'success' | 'error' | 'info') => void;
}
