"use client";

import { motion } from "framer-motion";
import { EyeOff, Clock, Banknote, Puzzle } from "lucide-react";

const problems = [
  {
    icon: EyeOff,
    title: "Invisible Care",
    description:
      "Families can't verify if visits happened, how long they lasted, or what services were actually delivered. Trust is broken.",
    stat: "0% real-time visibility",
    color: "border-red-200 bg-red-50/50",
    iconColor: "text-red-500",
  },
  {
    icon: Clock,
    title: "Too Late, Too Costly",
    description:
      "Health decline goes undetected between visits. By the time someone notices, it's an emergency. Hospital admissions cost 10x more.",
    stat: "70% prefer home care, <10% achieve it",
    color: "border-amber-200 bg-amber-50/50",
    iconColor: "text-amber-500",
  },
  {
    icon: Banknote,
    title: "Billions Wasted",
    description:
      "Overbilling, phantom visits, and under-servicing drain public funds. Reactive audits catch problems months too late.",
    stat: "$19.3B in needed reforms",
    color: "border-orange-200 bg-orange-50/50",
    iconColor: "text-brand",
  },
  {
    icon: Puzzle,
    title: "Fragmented Systems",
    description:
      "Hundreds of disconnected tools for rostering, notes, billing, and compliance. No single view of a patient's care journey.",
    stat: "861+ providers in silos",
    color: "border-purple-200 bg-purple-50/50",
    iconColor: "text-purple-500",
  },
];

export function Problem() {
  return (
    <section id="problem" className="py-24 relative">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium mb-4">
            The Problem
          </span>
          <h2 className="font-[var(--font-heading)] text-4xl sm:text-5xl font-black tracking-tight">
            A System That&apos;s
            <br />
            <span className="text-red-500">Failing Its People</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Australia invests over $85 billion annually in aged care and NDIS, yet the
            system remains reactive, opaque, and fragmented.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border p-6 ${problem.color} hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                  <problem.icon className={`w-6 h-6 ${problem.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-[var(--font-heading)] text-xl font-bold">
                    {problem.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                  <div className="mt-3 inline-block px-2.5 py-1 rounded-lg bg-white/80 text-xs font-semibold text-foreground">
                    {problem.stat}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
