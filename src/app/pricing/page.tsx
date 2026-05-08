"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  CheckCircle2, ArrowRight, HeartPulse, Users, Building2,
  Zap, Shield, BarChart2, MessageCircle, Phone, Star,
  IndianRupee,
} from "lucide-react";

const FAMILY_PLAN = {
  name: "Family Care",
  price: "₹2,000",
  period: "/month",
  badge: "For families (B2C)",
  description: "Direct subscription for families managing care for one elderly parent — perfect for NRIs and adult children.",
  color: "border-teal/40 ring-2 ring-teal/20",
  headerBg: "bg-teal/5",
  cta: "Start Family Plan",
  ctaClass: "bg-teal hover:bg-teal/90 text-white shadow-lg shadow-teal/25",
  features: [
    "1 patient (your parent)",
    "Up to 4 family member logins",
    "Real-time family dashboard",
    "AI health check-ins after each visit",
    "GPS-verified caregiver visits",
    "WhatsApp daily updates",
    "Baseline vs current health comparison",
    "Appointment calendar",
    "SOS emergency alerts",
    "Medication reminders",
    "Rate & review your caregiver",
    "Email + WhatsApp support",
  ],
  missing: [],
};

const PLANS = [
  {
    name: "Fixed",
    price: "₹30,000",
    period: "/month",
    badge: null,
    description: "Flat monthly fee — predictable cost regardless of how many patients or caregivers you onboard.",
    color: "border-border",
    headerBg: "bg-muted/30",
    cta: "Start Free Trial",
    ctaClass: "border border-brand text-brand hover:bg-brand hover:text-white",
    features: [
      "Unlimited patients",
      "Unlimited caregivers",
      "Full AI health check-ins + risk scoring",
      "GPS visit verification",
      "Family portal with live dashboard",
      "WhatsApp family notifications",
      "Shift handover notes",
      "SOS emergency alerts",
      "Medication reminders",
      "Revenue & billing dashboard",
      "Export reports (PDF/CSV)",
      "Email + chat support",
    ],
    missing: [
      "White-label option",
      "EHR / EMR integration",
      "Dedicated account manager",
      "On-premise deployment",
    ],
  },
  {
    name: "Per Caregiver",
    price: "₹1,000",
    period: "/caregiver/month",
    badge: "Most Popular",
    description: "Pay only for active caregivers. Best for growing agencies that want costs to scale with the team.",
    color: "border-brand ring-2 ring-brand/20",
    headerBg: "bg-brand/5",
    cta: "Start Free Trial",
    ctaClass: "bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/25",
    features: [
      "Unlimited patients",
      "Pay only per active caregiver",
      "Full AI health check-ins + risk scoring",
      "GPS visit verification",
      "Family portal with live dashboard",
      "Appointment calendar view",
      "Baseline health comparison",
      "Shift handover notes",
      "SOS emergency alerts",
      "Medication reminders",
      "Revenue & billing dashboard",
      "Export reports (PDF/CSV)",
      "WhatsApp family notifications",
      "Priority support",
    ],
    missing: [],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    badge: "Fully customised",
    description: "Multi-branch organisations, hospitals, and health networks needing custom deployment, SLAs, and integrations.",
    color: "border-border",
    headerBg: "bg-muted/30",
    cta: "Contact Sales",
    ctaClass: "border border-foreground text-foreground hover:bg-foreground hover:text-white",
    features: [
      "Everything in Per-Caregiver plan",
      "Multi-branch / multi-city support",
      "White-label option (agency.aayucare.in)",
      "Custom AI model fine-tuning",
      "EHR / EMR integration",
      "Aadhaar-linked patient records",
      "Ayushman Bharat / PM-JAY reporting",
      "Dedicated account manager",
      "On-premise deployment option",
      "SLA uptime guarantee",
      "Custom contract & billing terms",
    ],
    missing: [],
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "Yes — Growth and Professional plans come with a 14-day free trial. No credit card required. You can invite your team and start checking in patients immediately.",
  },
  {
    q: "Can I change plans later?",
    a: "Absolutely. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades apply at the end of your billing cycle.",
  },
  {
    q: "What happens if I exceed my patient limit?",
    a: "We'll notify you when you're at 80% capacity. You can upgrade to the next plan at any time — we won't cut off access without warning.",
  },
  {
    q: "Is AayuCare compliant with Indian health regulations?",
    a: "AayuCare is designed to align with Ministry of Health & Family Welfare guidelines and supports Ayushman Bharat / PM-JAY record formats. Enterprise customers can request formal compliance reports.",
  },
  {
    q: "Do caregivers need to pay anything?",
    a: "No. Caregiver accounts are free and unlimited on Professional and Enterprise plans. Only the care agency pays the subscription.",
  },
  {
    q: "What languages does AayuCare support?",
    a: "The platform supports English with Hindi, Tamil, Marathi, Gujarati, and Punjabi coming in Q3 2026. The AI voice assistant already works in en-IN locale.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="h-16 border-b border-border bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="font-[var(--font-heading)] font-bold text-lg">AayuCare</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login"><Button variant="ghost" size="sm" className="text-sm">Sign In</Button></Link>
            <Link href="/register"><Button size="sm" className="bg-brand hover:bg-brand-dark text-white rounded-full px-5">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-brand/10 text-brand border-0 mb-4">Simple, Transparent Pricing</Badge>
            <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl font-black tracking-tight">
              Plans for every care agency
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card. No lock-in. Cancel any time.
              All plans priced in <strong>INR</strong> — built for India.
            </p>
          </motion.div>
        </div>

        {/* B2C Family plan */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <Badge className="bg-teal/10 text-teal border-0 mb-2">For Families</Badge>
            <h2 className="font-[var(--font-heading)] text-2xl font-black">Caring for one elderly parent?</h2>
            <p className="text-sm text-muted-foreground mt-1">Direct B2C plan — no agency required.</p>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <div className={`rounded-2xl border ${FAMILY_PLAN.color} overflow-hidden`}>
              <div className={`${FAMILY_PLAN.headerBg} px-6 py-6 border-b border-border flex items-start justify-between gap-6 flex-wrap`}>
                <div className="flex-1 min-w-[240px]">
                  <Badge className="mb-3 text-xs bg-teal text-white">{FAMILY_PLAN.badge}</Badge>
                  <h2 className="font-[var(--font-heading)] text-2xl font-black">{FAMILY_PLAN.name}</h2>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{FAMILY_PLAN.description}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-end gap-1 justify-end">
                    <span className="font-[var(--font-heading)] text-4xl font-black">{FAMILY_PLAN.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">{FAMILY_PLAN.period}</span>
                  </div>
                  <Link href="/register?plan=family">
                    <Button className={`mt-3 rounded-xl h-11 px-6 font-semibold ${FAMILY_PLAN.ctaClass}`}>
                      {FAMILY_PLAN.cta} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-[11px] text-muted-foreground mt-2">14-day free trial · Cancel anytime</p>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What&apos;s included</p>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                  {FAMILY_PLAN.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Divider for B2B section */}
        <div className="text-center mb-8">
          <Badge className="bg-brand/10 text-brand border-0 mb-2">For Care Agencies</Badge>
          <h2 className="font-[var(--font-heading)] text-2xl font-black">Running a home care business?</h2>
          <p className="text-sm text-muted-foreground mt-1">Three flexible models — pick what fits your team size and growth stage.</p>
        </div>

        {/* B2B Pricing cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className={`rounded-2xl border ${plan.color} overflow-hidden h-full flex flex-col`}>
                {/* Header */}
                <div className={`${plan.headerBg} px-6 py-6 border-b border-border`}>
                  {plan.badge && (
                    <Badge className={`mb-3 text-xs ${plan.name === "Professional" ? "bg-brand text-white" : "bg-muted text-muted-foreground"}`}>
                      {plan.badge}
                    </Badge>
                  )}
                  <h2 className="font-[var(--font-heading)] text-xl font-black">{plan.name}</h2>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="font-[var(--font-heading)] text-4xl font-black">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>
                </div>

                {/* CTA */}
                <div className="px-6 py-4 border-b border-border">
                  <Link href={plan.name === "Enterprise" ? "mailto:sales@aayucare.in" : "/register"}>
                    <Button className={`w-full rounded-xl h-11 font-semibold transition-all ${plan.ctaClass}`}>
                      {plan.cta} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  {plan.name !== "Enterprise" && (
                    <p className="text-[11px] text-muted-foreground text-center mt-2">14-day free trial · No credit card</p>
                  )}
                </div>

                {/* Features */}
                <div className="px-6 py-5 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What&apos;s included</p>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/50 line-through">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Why AayuCare */}
        <div className="mb-20">
          <h2 className="font-[var(--font-heading)] text-3xl font-black text-center mb-10">Why care agencies choose AayuCare</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: "GPS Visit Verification", desc: "Every caregiver check-in is GPS stamped and timestamped — families and agencies always know visits actually happened.", color: "text-brand bg-brand/10" },
              { icon: Zap, title: "AI Health Check-ins", desc: "Multimodal AI (voice + camera) conducts structured health assessments across 7 domains after every visit.", color: "text-teal bg-teal/10" },
              { icon: Users, title: "Family Transparency", desc: "Real-time dashboard for families — daily updates, mood observations, medication compliance, and risk scores.", color: "text-violet-600 bg-violet-50" },
              { icon: BarChart2, title: "Revenue Dashboard", desc: "Track billable hours, verified services, and monthly revenue with INR-native reporting.", color: "text-green-600 bg-green-50" },
              { icon: MessageCircle, title: "SOS Emergency Alerts", desc: "One-tap SOS from the patient portal triggers instant alerts to caregivers, family, and the agency.", color: "text-red-600 bg-red-50" },
              { icon: Building2, title: "Built for India", desc: "Designed for Indian home care agencies — INR pricing, en-IN locale, Aadhaar-ready, Ayushman Bharat aligned.", color: "text-amber-600 bg-amber-50" },
            ].map((feat, i) => (
              <motion.div key={feat.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <div className="p-5 rounded-xl border border-border bg-white hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl ${feat.color} flex items-center justify-center mb-3`}>
                    <feat.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{feat.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-20 bg-muted/30 rounded-2xl p-8">
          <h2 className="font-[var(--font-heading)] text-2xl font-black text-center mb-8">Trusted by care agencies across India</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: "AayuCare transformed how we operate. Our families now message us saying they finally feel confident about care.", name: "Dr. Anjali Mehta", org: "Aarogya Home Care, Delhi", stars: 5 },
              { quote: "The GPS verification alone saved us from two fraudulent caregiver claims in the first month. Worth every rupee.", name: "Rakesh Gupta", org: "SevaBhav Services, Mumbai", stars: 5 },
              { quote: "Our NRI clients love the real-time dashboard. They can check on their parents from Singapore anytime.", name: "Priya Nair", org: "CaringHands, Bangalore", stars: 5 },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-xl p-5 border border-border">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }, (_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-foreground italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="font-[var(--font-heading)] text-3xl font-black text-center mb-10">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {FAQS.map((faq) => (
              <div key={faq.q} className="p-5 rounded-xl border border-border bg-white">
                <h3 className="font-semibold text-sm mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-brand rounded-2xl p-10 text-white">
          <h2 className="font-[var(--font-heading)] text-3xl font-black mb-3">Ready to transform your care agency?</h2>
          <p className="text-brand-foreground/80 mb-6">Start your 14-day free trial. Set up in under 10 minutes.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-brand hover:bg-white/90 rounded-full px-8 font-semibold">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="tel:+918800000000">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-full px-8 border border-white/30">
                <Phone className="w-4 h-4 mr-2" />+91 88000 00000
              </Button>
            </a>
          </div>
          <p className="text-xs text-white/60 mt-4">No credit card · Cancel anytime · INR billing</p>
        </div>
      </main>
    </div>
  );
}
