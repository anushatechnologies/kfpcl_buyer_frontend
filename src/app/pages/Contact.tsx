import { Mail, MapPin, Phone, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { motion } from "motion/react";
import { APP_COPY } from "../lib/config";

const contactCards = [
  {
    icon: Phone,
    title: "Phone support",
    detail: APP_COPY.phonePrimary,
    extra: APP_COPY.phoneSecondary,
    accent: "#1E5AFA",
  },
  {
    icon: Mail,
    title: "Email support",
    detail: APP_COPY.supportEmail,
    extra: APP_COPY.backupEmail,
    accent: "#8B5CF6",
  },
  {
    icon: MapPin,
    title: "Office",
    detail: APP_COPY.headquarters,
    extra: "Hyderabad, Telangana",
    accent: "#059669",
  },
  {
    icon: ShieldCheck,
    title: "Customer care",
    detail: "Order help, delivery updates, and account support",
    extra: "Available for everyday shopping assistance",
    accent: "#D4A853",
  },
];

export function Contact() {
  return (
    <div className="app-shell">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.6rem] border border-[#E2E8F0]/65 bg-[linear-gradient(135deg,#0A1628,#1A3A6B,#D4A853)] px-6 py-10 text-white shadow-[0_35px_95px_rgba(10,22,40,0.14)] sm:px-8 lg:px-12 animate-gradient"
        style={{ backgroundSize: '200% 200%' }}
      >
        {/* Animated mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(30,90,250,0.18),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(212,168,83,0.12),transparent_50%)] pointer-events-none" />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A853] shadow-[0_0_6px_#D4A853]" />
            Customer support
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="page-hero-title mt-6 max-w-4xl text-white"
          >
            Need help with ordering, delivery, or account access?
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="section-copy mt-5 max-w-2xl text-white/82"
          >
            Reach our team for help with orders, delivery updates, payments, or account access.
          </motion.p>
        </div>
      </motion.section>

      {/* Contact Cards */}
      <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {contactCards.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * index + 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="group rounded-[2rem] border border-[#E2E8F0]/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,253,0.98))] p-6 shadow-[0_18px_42px_rgba(10,22,40,0.05)] transition-shadow hover:shadow-[0_24px_60px_rgba(10,22,40,0.10)]"
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: `${item.accent}14` }}
            >
              <item.icon className="h-6 w-6" style={{ color: item.accent }} />
            </div>
            <h2 className="mt-5 font-sans text-[clamp(1.9rem,4vw,2.4rem)] font-bold tracking-tight text-[#0A1628]">{item.title}</h2>
            <p className="mt-3 text-sm font-medium leading-7 text-[#0A1628]">{item.detail}</p>
            <p className="mt-2 text-sm leading-7 text-[#6B7B94]">{item.extra}</p>
            <div className="mt-4 h-1 w-12 rounded-full transition-all duration-500 group-hover:w-20" style={{ background: `linear-gradient(90deg, ${item.accent}, transparent)` }} />
          </motion.article>
        ))}
      </section>

      {/* Support Details */}
      <section className="mt-10 grid gap-8 xl:grid-cols-[1fr_1fr]">
        <motion.article
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="group relative overflow-hidden rounded-[2.2rem] border border-[#E2E8F0] bg-[linear-gradient(180deg,#FAFBFD,#EEF2F7)] p-7 shadow-[0_24px_46px_rgba(10,22,40,0.06)]"
        >
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(30,90,250,0.06),transparent_70%)] transition-transform duration-700 group-hover:scale-150" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                <ShoppingBag className="h-6 w-6 text-[#1E5AFA]" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#6B7B94]">Customer journey</div>
                <h2 className="section-title">Support during checkout</h2>
              </div>
            </div>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[#6B7B94]">
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Help customers sign in with OTP when they want to continue to checkout.</li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Confirm address details and browser location if address validation fails.</li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Guide shoppers through COD or online payment based on available checkout options.</li>
            </ul>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="group relative overflow-hidden rounded-[2.2rem] border border-[#E2E8F0]/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,253,0.98))] p-7 shadow-[0_25px_60px_rgba(10,22,40,0.06)]"
        >
          <div className="absolute -left-12 -bottom-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.06),transparent_70%)] transition-transform duration-700 group-hover:scale-150" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBF0FF]">
                <Truck className="h-6 w-6 text-[#1E5AFA]" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#6B7B94]">Delivery operations</div>
                <h2 className="section-title">Support after order placement</h2>
              </div>
            </div>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[#6B7B94]">
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A853]" />Track order status, payment updates, and saved delivery details with customers.</li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A853]" />Online payments are opened securely from the website and confirmed before fulfilment.</li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A853]" />Cash on delivery orders move straight into fulfilment after address confirmation.</li>
            </ul>
          </div>
        </motion.article>
      </section>
    </div>
  );
}
