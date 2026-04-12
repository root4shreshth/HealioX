"use client";

import { motion } from "framer-motion";
import { MapPin, MessageCircle, BarChart3, ArrowRight } from "lucide-react";

const screens = [
  {
    step: "01",
    icon: MapPin,
    title: "Caregiver App",
    subtitle: "Verify Every Visit",
    description:
      "GPS check-in/check-out, quick-tap service logging, voice notes, and evidence capture. Proves care happened with zero extra effort.",
    features: [
      "GPS-verified arrival & departure",
      "One-tap service logging",
      "Voice-to-text care notes",
      "Photo evidence capture",
    ],
    color: "from-brand to-brand-dark",
    bgAccent: "bg-brand/5",
  },
  {
    step: "02",
    icon: MessageCircle,
    title: "AI Health Check-in",
    subtitle: "Detect Decline Early",
    description:
      "Conversational AI conducts daily health assessments through simple, friendly questions. Analyses 7 health domains and generates risk scores.",
    features: [
      "Voice-first elderly-friendly interface",
      "7-domain health assessment",
      "Pattern recognition over time",
      "Automatic risk scoring",
    ],
    color: "from-teal to-teal-dark",
    bgAccent: "bg-teal/5",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "Family Dashboard",
    subtitle: "See Everything",
    description:
      "Real-time visibility into visit verification, health trends, risk alerts, and care quality scores. Peace of mind for families, insights for providers.",
    features: [
      "Live visit timeline",
      "Health trend visualizations",
      "Push notification alerts",
      "Care quality scores",
    ],
    color: "from-violet-500 to-violet-700",
    bgAccent: "bg-violet-50",
  },
];

export function Solution() {
  return (
    <section id="solution" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-teal/10 text-teal text-sm font-medium mb-4">
            The Solution
          </span>
          <h2 className="font-[var(--font-heading)] text-4xl sm:text-5xl font-black tracking-tight">
            Three Screens.
            <br />
            <span className="text-gradient">One Connected Loop.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            HealioX closes the gap between care delivery, patient wellbeing, and
            public accountability in one seamless platform.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {screens.map((screen, i) => (
            <motion.div
              key={screen.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`relative rounded-2xl ${screen.bgAccent} border border-border/50 p-8 group hover:shadow-xl transition-all duration-300`}
            >
              {/* Step number */}
              <div className="text-7xl font-[var(--font-heading)] font-black text-black/[0.04] absolute top-4 right-6 select-none">
                {screen.step}
              </div>

              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${screen.color} flex items-center justify-center mb-6 shadow-lg`}
              >
                <screen.icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="font-[var(--font-heading)] text-2xl font-bold">
                {screen.title}
              </h3>
              <p className="text-sm font-semibold text-brand mt-1">
                {screen.subtitle}
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {screen.description}
              </p>

              {/* Features list */}
              <ul className="mt-5 space-y-2">
                {screen.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                  >
                    <ArrowRight className="w-3 h-3 text-brand shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
