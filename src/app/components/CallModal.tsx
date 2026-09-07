import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneCall, Copy, Check, X, MessageCircle, ShieldCheck } from "lucide-react";
import { useCallModalStore } from "../store/callModalStore";

export function CallModal() {
  const { isOpen, phoneNumber, title, subtitle, productName, closeCallModal } = useCallModalStore();
  const [copied, setCopied] = useState(false);

  // Formatted display number: +91 63099 81444
  const rawDigits = phoneNumber.replace(/\D/g, "");
  const cleanNumber = rawDigits.startsWith("91") && rawDigits.length === 12
    ? rawDigits.slice(2)
    : rawDigits;
  const formattedDisplay = `+91 ${cleanNumber.slice(0, 5)} ${cleanNumber.slice(5)}`;
  const telHref = `tel:+91${cleanNumber}`;
  const whatsappHref = `https://wa.me/91${cleanNumber}?text=${encodeURIComponent(
    productName ? `Hello, I would like to inquire about ${productName}.` : "Hello, I would like to know more about KFPCL products."
  )}`;

  const handleCopy = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [cleanNumber]);

  // Handle escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCallModal();
    };
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCallModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={closeCallModal}
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 350 }}
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 z-10 overflow-hidden text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient background glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-[#0A4D3C]/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#D4A853]/15 blur-2xl" />

            {/* Close Button */}
            <button
              type="button"
              onClick={closeCallModal}
              className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              aria-label="Close call dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon Header */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A4D3C] to-[#0E5E4A] shadow-lg shadow-[#0A4D3C]/25 ring-4 ring-[#0A4D3C]/10">
              <Phone className="h-8 w-8 text-[#D4A853] animate-pulse" />
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-lg font-black text-[#1A2332] tracking-tight">
              {title}
            </h3>
            <p className="mt-1 text-xs text-[#6B7B94] leading-relaxed line-clamp-2 px-2">
              {subtitle}
            </p>

            {/* Highlighted Mobile Number Card */}
            <div className="mt-5 rounded-2xl border border-[#0A4D3C]/15 bg-gradient-to-b from-[#F0FBF7] to-[#E5F7F1] p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A4D3C]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0A4D3C]" />
                Official Support Number
              </div>
              <div className="mt-1.5 text-2xl font-black tracking-wider text-[#0A4D3C] font-mono select-all">
                {formattedDisplay}
              </div>
              <div className="text-[11px] font-semibold text-gray-500 mt-0.5">
                ({cleanNumber})
              </div>

              {/* Copy number button */}
              <button
                type="button"
                onClick={handleCopy}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#0A4D3C]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#0A4D3C] shadow-xs hover:bg-white/80 active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2.5">
              <a
                href={telHref}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0A4D3C] to-[#0E5E4A] py-3 text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-[#0A4D3C]/20 hover:from-[#0E5E4A] hover:to-[#0A4D3C] active:scale-[0.98] transition-all"
              >
                <PhoneCall className="h-4 w-4 text-[#D4A853]" />
                Call Now ({cleanNumber})
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-[#25D366]/10 py-2.5 text-xs font-bold text-emerald-700 hover:bg-[#25D366]/20 transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                Or Chat on WhatsApp
              </a>
            </div>

            <button
              type="button"
              onClick={closeCallModal}
              className="mt-4 text-xs font-semibold text-[#6B7B94] hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
