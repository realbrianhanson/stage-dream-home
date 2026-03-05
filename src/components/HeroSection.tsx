import { motion } from "framer-motion";
import heroImage from "@/assets/hero-staged-room.jpg";

interface HeroSectionProps {
  onGetStarted: () => void;
}

const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grain-overlay">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Beautifully staged luxury living room"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, hsl(38 60% 55% / 0.05) 0%, transparent 50%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 8px hsl(38 60% 55% / 0.5)' }} />
          <span className="text-accent font-body text-sm tracking-[0.3em] uppercase">AI-Powered Virtual Staging</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-medium text-primary-foreground leading-[1.05] mb-8"
        >
          Transform Empty Rooms Into{" "}
          <span className="italic text-accent">Dream Homes</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-body text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-12"
        >
          Upload vacant room photos and let AI stage them with beautiful
          furniture and decor. Sell properties faster with stunning visuals.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGetStarted}
          className="gold-gradient-animated text-accent-foreground font-body font-semibold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
        >
          Stage Your First Room
        </motion.button>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 rounded-full border-2 border-primary-foreground/40 flex items-start justify-center p-1.5"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
