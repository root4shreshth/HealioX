"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Shield, Activity, Eye } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-brand/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal/10 rounded-full blur-3xl animate-blob animation-delay-2000" />

      {/* Large background text like Pixel Rise */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none">
        <h2 className="text-[12vw] font-[var(--font-heading)] font-black text-outline leading-none tracking-tighter whitespace-nowrap">
          HEALIOX
        </h2>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-sm font-medium mb-6">
              <Activity className="w-4 h-4" />
              AI-Powered Care Intelligence
            </div>

            <h1 className="font-[var(--font-heading)] text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              CARE THAT
              <br />
              <span className="text-gradient">PROVES</span>
              <br />
              ITSELF
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed">
              Verifying every visit. Detecting decline early. Giving families
              real-time visibility. One platform transforming aged care and NDIS
              accountability.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-brand hover:bg-brand-dark text-white rounded-full px-8 text-base h-12 shadow-lg shadow-brand/25"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 text-base h-12"
                >
                  <Play className="w-4 h-4 mr-2" />
                  See How It Works
                </Button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal" />
                NDIS Compliant
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-teal" />
                GPS Verified
              </div>
            </div>
          </motion.div>

          {/* Right - Stats card cluster */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Main stat card */}
            <div className="absolute top-0 right-0 glass rounded-2xl p-6 shadow-xl w-64">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-green-600 -rotate-45" />
                </div>
                <span className="text-4xl font-[var(--font-heading)] font-black">
                  132%
                </span>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Earlier Intervention Rate
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                AI-detected health decline before manual observation
              </p>
            </div>

            {/* Secondary stat */}
            <div className="absolute top-36 left-0 glass rounded-2xl p-5 shadow-xl w-56">
              <div className="text-3xl font-[var(--font-heading)] font-black text-brand">
                95%
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">
                Visit Verification
              </p>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[95%] bg-brand rounded-full" />
              </div>
            </div>

            {/* Alert card */}
            <div className="absolute bottom-0 right-8 glass rounded-2xl p-4 shadow-xl w-60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Risk Alert</p>
                  <p className="text-xs text-muted-foreground">
                    Margaret S. - Mobility declining
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                  Moderate
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  2 min ago
                </span>
              </div>
            </div>

            {/* Spacer for absolute positioning */}
            <div className="h-[420px]" />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
        <div className="w-5 h-8 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-1">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-1 bg-muted-foreground/50 rounded-full"
          />
        </div>
        <span className="text-xs">Scroll to explore</span>
      </div>
    </section>
  );
}
