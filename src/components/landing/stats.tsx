"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, IndianRupee, AlertTriangle } from "lucide-react";

const stats = [
  {
    value: "₹78,000Cr",
    label: "Elder Care Market",
    description: "India's home care market by 2027",
    icon: IndianRupee,
    color: "text-brand",
    bg: "bg-brand/10",
  },
  {
    value: "140M+",
    label: "Elderly Indians",
    description: "60+ population, growing 4× faster",
    icon: Users,
    color: "text-teal",
    bg: "bg-teal/10",
  },
  {
    value: "73%",
    label: "Families Lack Visibility",
    description: "Into daily elder care quality",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    value: "50K+",
    label: "Caregiver Shortfall",
    description: "Trained elder care workers needed",
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
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="font-[var(--font-heading)] text-3xl sm:text-4xl font-black tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold mt-0.5">{stat.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.description}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
