import { ArrowRight, ShieldCheck, Store, Truck, Users } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router";

const aboutHero =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80";

const features = [
  {
    icon: Truck,
    title: "Easy ordering",
    description: "Choose the right pack size, save your favourites, and move through checkout with clarity.",
    accent: "#1E5AFA",
  },
  {
    icon: Store,
    title: "Wide assortment",
    description: "Browse fruits, vegetables, staples, dairy, snacks, and daily essentials in one place.",
    accent: "#059669",
  },
  {
    icon: ShieldCheck,
    title: "Thoughtful design",
    description: "Cleaner filtering, better product pages, and less friction from landing page to payment.",
    accent: "#D4A853",
  },
  {
    icon: Users,
    title: "Trusted service",
    description: "Built to help customers order with confidence and stay informed through delivery.",
    accent: "#8B5CF6",
  },
];

export function About() {
  return (
    <div className="app-shell">
      {/* Hero Banner */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2.6rem] border border-[#E2E8F0]/65 shadow-[0_35px_95px_rgba(10,22,40,0.14)]"
      >
        <img src={aboutHero} alt="Karthikeya Farmer Producer Company Limited" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(10,22,40,0.92),rgba(26,58,107,0.84)_45%,rgba(255,255,255,0)_75%)]" />

        {/* Animated accent blobs */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(30,90,250,0.15),transparent_70%)] animate-pulse-glow pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(212,168,83,0.12),transparent_70%)] animate-pulse-glow pointer-events-none" style={{ animationDelay: '1.5s' }} />

        <div className="relative px-6 py-12 text-white sm:px-8 lg:px-12 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/78 backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A853] shadow-[0_0_6px_#D4A853]" />
            About Karthikeya Farmer Producer Company Limited
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="page-hero-title mt-6 max-w-4xl text-white"
          >
            Fresh groceries, reliable service, and a friendlier digital store.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="section-copy mt-5 max-w-2xl text-white/80"
          >
            Karthikeya Farmer Producer Company Limited brings neighbourhood grocery shopping online with clear product browsing, easy reordering, and a smoother checkout experience.
          </motion.p>
        </div>
      </motion.section>

      {/* Feature Cards */}
      <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((item, index) => (
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
            <p className="mt-3 text-sm leading-7 text-[#6B7B94]">{item.description}</p>
            <div className="mt-4 h-1 w-12 rounded-full transition-all duration-500 group-hover:w-20" style={{ background: `linear-gradient(90deg, ${item.accent}, transparent)` }} />
          </motion.article>
        ))}
      </section>

      {/* Details Grid */}
      <section className="mt-10 grid gap-8 xl:grid-cols-[1fr_0.9fr]">
        <motion.article
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="group relative overflow-hidden rounded-[2.2rem] border border-[#E2E8F0] bg-[linear-gradient(180deg,#FAFBFD,#EEF2F7)] p-7 shadow-[0_24px_46px_rgba(10,22,40,0.06)]"
        >
          {/* Decorative corner gradient */}
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(30,90,250,0.06),transparent_70%)] transition-transform duration-700 group-hover:scale-150" />

          <div className="relative">
            <div className="text-xs uppercase tracking-[0.22em] text-[#6B7B94]">What changed</div>
            <h2 className="mt-4 font-sans text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-[#0A1628]">Designed for a smoother everyday shopping routine.</h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-[#6B7B94]">
              <p>We rebuilt the storefront to make grocery shopping easier to browse, compare, and order from any device.</p>
              <p>The experience now keeps search, category browsing, delivery choices, offers, and checkout working together more naturally.</p>
              <p>The result is a more polished Karthikeya Farmer Producer Company Limited journey that feels clearer for first-time shoppers and faster for returning customers.</p>
            </div>
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
            <div className="text-xs uppercase tracking-[0.22em] text-[#6B7B94]">Explore the result</div>
            <h2 className="mt-4 font-sans text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-[#0A1628]">See the shopping flow in action.</h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[#6B7B94]">
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Use the global search to jump straight to favourite products.</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Open a category page and try the filters, sorting, and product suggestions.</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Add the right pack size to your basket and review your savings.</li>
              <li className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E5AFA]" />Sign in with OTP and complete checkout in a more guided flow.</li>
            </ul>
            <Link
              to="/shop"
              className="group/cta mt-8 inline-flex items-center gap-2 rounded-full bg-[#0A1628] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(10,22,40,0.18)] transition-all duration-300 hover:bg-[#D4A853] hover:text-[#0A1628] hover:shadow-[0_22px_40px_rgba(212,168,83,0.25)]"
            >
              Explore the shop
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-1" />
            </Link>
          </div>
        </motion.article>
      </section>
    </div>
  );
}
