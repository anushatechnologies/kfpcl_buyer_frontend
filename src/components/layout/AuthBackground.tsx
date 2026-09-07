'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export default function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-brand-50 overflow-hidden">
      {/* ── Keyframes for background animation ── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.15); }
          66% { transform: translate(20px, -30px) scale(0.95); }
        }
        .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
        .animate-float-slower { animation: float-slower 20s ease-in-out infinite; }
      `}} />

      {/* ── Abstract Background Elements ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Very faint grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Soft glowing blobs */}
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-200/40 blur-[100px] animate-float-slow mix-blend-multiply"></div>
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-100/40 blur-[120px] animate-float-slower mix-blend-multiply"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full bg-brand-300/30 blur-[150px] animate-float-slow mix-blend-multiply"></div>
      </div>

      {/* ── Return to Home ── */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-dark-600 hover:text-dark-900 bg-white/50 hover:bg-white/80 backdrop-blur-md rounded-lg border border-white/40 shadow-sm transition-all group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">Return to Home</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </div>

      {/* ── Main Content Container ── */}
      <div className="relative z-10 w-full p-4 sm:p-6 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
