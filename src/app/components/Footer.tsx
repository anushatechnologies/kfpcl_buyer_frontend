import { Mail, MapPin, Phone } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { APP_COPY } from "../lib/config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-18 border-t border-[#0A4D3C]/10 bg-[linear-gradient(180deg,#062C22,#031A14)] text-white overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(14,94,74,0.08),transparent_65%)]" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.06),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:28px_28px]" />
      </div>

      <div className="app-shell !py-12 relative">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.9fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <img
                src="/images/image-logo.png"
                alt={APP_COPY.brand}
                className="h-14 w-14 rounded-[1.2rem] border border-white/15 bg-white object-contain p-1 shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
              />
              <div>
                <div className="font-sans text-3xl font-bold">{APP_COPY.brand}</div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Professional grocery ordering experience
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm leading-7 text-white/72">
              Browse fresh categories, compare pack sizes, save your address, and place orders with a smoother
              Karthikeya Farmer Producer Company Limited experience.
            </p>

            {/* Decorative gradient line */}
            <div className="mt-5 h-px w-32 bg-gradient-to-r from-[#0A4D3C]/40 via-[#D4A853]/30 to-transparent" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Explore</h3>
            <div className="mt-5 space-y-3 text-sm text-white/78">
              <Link className="group block transition hover:text-white" to="/">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Home
                </span>
              </Link>
              <Link className="group block transition hover:text-white" to="/shop">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Shop
                </span>
              </Link>
              <Link className="group block transition hover:text-white" to="/about">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  About
                </span>
              </Link>
              <Link className="group block transition hover:text-white" to="/contact">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Support
                </span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Policies</h3>
            <div className="mt-5 space-y-3 text-sm text-white/78">
              <Link className="group block transition hover:text-white" to="/privacy-policy">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Privacy policy
                </span>
              </Link>
              <Link className="group block transition hover:text-white" to="/terms-of-service">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Terms of service
                </span>
              </Link>
              <Link className="group block transition hover:text-white" to="/cart">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Cart
                </span>
              </Link>
              <Link className="group block transition hover:text-white" to="/checkout">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-[#D4A853]/50 transition-all duration-300 group-hover:w-3 group-hover:bg-[#D4A853]" />
                  Checkout
                </span>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">Contact</h3>
            <div className="mt-5 space-y-4 text-sm leading-7 text-white/78">
              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <MapPin className="h-4 w-4 text-[#D4A853]" />
                </div>
                <span> C99F+VXG, Madhura Nagar Colony, Gachibowli, Hyderabad, Telangana 500104.</span>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Phone className="h-4 w-4 text-[#D4A853]" />
                </div>
                <a className="block transition hover:text-white" href="tel:+916309981444">+91 6309 981 444</a>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Mail className="h-4 w-4 text-[#D4A853]" />
                </div>
                <div>
                                      <a className="block transition hover:text-white" href={`mailto:${APP_COPY.supportEmail}`}>
                    {APP_COPY.supportEmail}
                  </a>
                                      <a className="block transition hover:text-white" href={`mailto:${APP_COPY.backupEmail}`}>
                    {APP_COPY.backupEmail}
                  </a>

                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/52 sm:flex-row sm:items-center sm:justify-between">
          <p>{year} {APP_COPY.brand}. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            Powered by
            <span className="font-semibold bg-gradient-to-r from-[#06D6A0] to-[#D4A853] bg-clip-text text-transparent">KFPCL</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
