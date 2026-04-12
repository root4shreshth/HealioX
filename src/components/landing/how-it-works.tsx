"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Caregiver Arrives",
    description:
      "GPS auto-verifies location. One tap to check in. Clock starts.",
    color: "bg-brand",
  },
  {
    number: "02",
    title: "Services Logged",
    description:
      "Quick-tap categories, voice notes, photo evidence. Zero paperwork.",
    color: "bg-brand-dark",
  },
  {
    number: "03",
    title: "AI Health Check-in",
    description:
      "Conversational AI assesses patient across 7 health domains in 2 minutes.",
    color: "bg-teal",
  },
  {
    number: "04",
    title: "Risk Analysed",
    description:
      "AI scores risk, detects trends, compares to history. Flags concerns instantly.",
    color: "bg-teal-dark",
  },
  {
    number: "05",
    title: "Stakeholders Notified",
    description:
      "Family gets visibility. Provider gets insights. Alerts escalate if needed.",
    color: "bg-violet-600",
  },
  {
    number: "06",
    title: "Dashboard Updates",
    description:
      "Real-time dashboards show verified visits, health trends, and care quality.",
    color: "bg-slate-800",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand text-sm font-medium mb-4">
            The Connected Care Loop
          </span>
          <h2 className="font-[var(--font-heading)] text-4xl sm:text-5xl font-black tracking-tight">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            From caregiver arrival to family peace of mind, in six seamless steps.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative rounded-2xl border border-border bg-background p-6 group hover:shadow-lg transition-all"
            >
              {/* Step number */}
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${step.color} text-white text-sm font-bold mb-4`}
              >
                {step.number}
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 -right-3 w-6 h-[2px] bg-border" />
              )}

              <h3 className="font-[var(--font-heading)] text-lg font-bold">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
