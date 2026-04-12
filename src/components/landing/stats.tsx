"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, AlertTriangle } from "lucide-react";

const stats = [
  {
    value: "$85B+",
    label: "Combined Annual Spend",
    description: "Aged care & NDIS funding",
    icon: DollarSign,
    color: "text-brand",
    bg: "bg-brand/10",
  },
  {
    value: "717K+",
    label: "NDIS Participants",
    description: "And growing rapidly",
    icon: Users,
    color: "text-teal",
    bg: "bg-teal/10",
  },
  {
    value: "2,100+",
    label: "Problematic Providers",
    description: "Flagged by NDIS for claiming issues",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    value: "110K",
    label: "Worker Shortfall",
    description: "Projected by 2030",
    icon: TrendingUp,
    color: "text-red-500",
    bg: "bg-red-50",
  },
];

export function Stats() {
  return (
    <section className="py-16 bg-white border-y border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="font-[var(--font-heading)] text-3xl sm:text-4xl font-black tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold mt-0.5">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stat.description}
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
