"use client";

import { motion } from "framer-motion";
import {
  Brain,
  MapPinCheck,
  Bell,
  Shield,
  Mic,
  LineChart,
  Globe,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Risk Scoring",
    description:
      "7-domain health analysis with pattern recognition. Detects gradual decline across mood, pain, mobility, medication, sleep, appetite, and cognition.",
  },
  {
    icon: MapPinCheck,
    title: "GPS Geofencing",
    description:
      "Automatic visit verification within 100m of patient location. Proves care happened with cryptographic-grade evidence.",
  },
  {
    icon: Bell,
    title: "Smart Escalation",
    description:
      "Tiered alert system: family first, then provider, then emergency. Configurable thresholds per patient.",
  },
  {
    icon: Shield,
    title: "Anomaly Detection",
    description:
      "AI spots billing irregularities, phantom visits, and service mismatches before they become costly fraud.",
  },
  {
    icon: Mic,
    title: "Voice-First Design",
    description:
      "Built for elderly users who may struggle with typing. Voice input, large text, high contrast, minimal clicks.",
  },
  {
    icon: LineChart,
    title: "Health Trends",
    description:
      "30-day rolling trend analysis across all health domains. Visualise improvement or decline at a glance.",
  },
  {
    icon: Globe,
    title: "Multilingual",
    description:
      "Support for diverse Australian communities with AI-powered multilingual health check-ins.",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "WebSocket-powered dashboards update instantly. No refresh needed. See changes as they happen.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Large background text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
        <h2 className="text-[15vw] font-[var(--font-heading)] font-black text-outline leading-none tracking-tighter opacity-50">
          FEATURES
        </h2>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand text-sm font-medium mb-4">
            Capabilities
          </span>
          <h2 className="font-[var(--font-heading)] text-4xl sm:text-5xl font-black tracking-tight">
            Built for Real
            <br />
            <span className="text-gradient">Care Intelligence</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-2xl bg-white border border-border/50 p-6 hover:shadow-xl hover:border-brand/20 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
                <feature.icon className="w-5 h-5 text-brand group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-[var(--font-heading)] font-bold text-base">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
