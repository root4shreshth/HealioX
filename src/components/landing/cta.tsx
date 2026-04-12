"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-teal-dark" />
      <div className="absolute inset-0 bg-grid opacity-10" />

      {/* Large faded text */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none overflow-hidden">
        <h2 className="text-[10vw] font-[var(--font-heading)] font-black text-white/5 leading-none tracking-tighter whitespace-nowrap">
          CARE INTELLIGENCE
        </h2>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6 backdrop-blur">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>

          <h2 className="font-[var(--font-heading)] text-4xl sm:text-5xl font-black text-white tracking-tight">
            Every Patient Deserves
            <br />
            Verified Care.
          </h2>

          <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">
            Every family deserves visibility. Every dollar deserves
            accountability. Start transforming care delivery today.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-brand hover:bg-white/90 rounded-full px-8 text-base h-12 font-semibold shadow-xl"
              >
                Start Free Pilot
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 text-base h-12 border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                Login to Dashboard
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/50">
            No credit card required. Free for hackathon evaluation.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
