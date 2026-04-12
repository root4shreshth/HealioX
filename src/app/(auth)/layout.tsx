import Link from "next/link";
import { HeartPulse } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand via-brand-dark to-teal-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />

        {/* Large background text */}
        <div className="absolute bottom-10 left-10 pointer-events-none select-none">
          <h2 className="text-[8vw] font-[var(--font-heading)] font-black text-white/5 leading-none tracking-tighter">
            HEALIO
            <br />X
          </h2>
        </div>

        <div className="relative flex flex-col justify-between p-12 text-white">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="font-[var(--font-heading)] font-bold text-xl">
              HealioX
            </span>
          </Link>

          {/* Content */}
          <div>
            <h1 className="font-[var(--font-heading)] text-4xl xl:text-5xl font-black tracking-tight leading-tight">
              Care That
              <br />
              Proves Itself.
            </h1>
            <p className="mt-4 text-lg text-white/70 max-w-md">
              Verifying every visit. Detecting decline early. Giving families
              real-time visibility into the care their loved ones receive.
            </p>

            {/* Floating stats */}
            <div className="mt-8 flex gap-4">
              <div className="glass rounded-xl p-4 bg-white/10 backdrop-blur">
                <div className="text-2xl font-[var(--font-heading)] font-black">
                  95%
                </div>
                <div className="text-xs text-white/60">Visit Verification</div>
              </div>
              <div className="glass rounded-xl p-4 bg-white/10 backdrop-blur">
                <div className="text-2xl font-[var(--font-heading)] font-black">
                  7
                </div>
                <div className="text-xs text-white/60">Health Domains</div>
              </div>
              <div className="glass rounded-xl p-4 bg-white/10 backdrop-blur">
                <div className="text-2xl font-[var(--font-heading)] font-black">
                  24/7
                </div>
                <div className="text-xs text-white/60">AI Monitoring</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/40">
            &copy; 2026 HealioX &middot; UWA Hack for Impact
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
