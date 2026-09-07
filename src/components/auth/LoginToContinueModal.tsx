'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck, X } from 'lucide-react';

interface LoginToContinueModalProps {
  isOpen: boolean;
  nextPath: string;
  onClose: () => void;
}

export default function LoginToContinueModal({
  isOpen,
  nextPath,
  onClose,
}: LoginToContinueModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = () => {
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-dark-900/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-to-continue-title"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/70 bg-white p-6 shadow-2xl animate-fade-in"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-50 hover:text-dark-700"
          aria-label="Close login prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h2 id="login-to-continue-title" className="pr-8 text-xl font-bold font-display text-dark-900">
          Login to Continue
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-dark-500">
          Please log in as a buyer to continue with your order.
        </p>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={handleLogin} className="btn-primary flex-1">
            <LogIn className="h-4 w-4" />
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
