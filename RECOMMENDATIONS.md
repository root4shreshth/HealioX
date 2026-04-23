# HealioX — Feature Recommendations (All Portals)

Prioritised by impact × effort. "Quick wins" are doable in a day; "strategic" features differentiate the product for the Indian elder-care market.

---

## 1. Patient Portal

### Quick wins
- **Medication pill-box reminder (voice + WhatsApp)** — AI nudges elder at scheduled times; if no acknowledgement in 15 min, escalates WhatsApp to family.
- **Emergency SOS (one tap)** — Already scaffolded; wire to notifications_log + outbound WhatsApp to all linked family + caregiver.
- **Vernacular voice** — Let elder pick Hindi / Tamil / Bengali / Marathi / Telugu. Use browser `speechSynthesis` with `lang` tag and fall back to English TTS when voice missing.
- **Family photo wall on home screen** — Show last 3 photos uploaded by family. Reduces loneliness — a known health driver.

### Strategic
- **AI loneliness companion** — 5-min daily check-in that doubles as mental-health screener (PHQ-2). Flag high scores to family/caregiver.
- **Teleconsult button** — One-tap video call to on-panel doctor (partner with Practo / 1mg). Revenue share.
- **Prescription OCR** — Snap prescription → auto-populate medication reminders.

---

## 2. Caregiver Portal

### Quick wins
- **Patient history card before visit starts** — Show last 3 check-in scores, current meds, allergies, last concern raised. Cuts rework from unfamiliar caregivers.
- **Shift handover notes** — Already wired in checkout; surface previous caregiver's handover at next check-in.
- **Offline check-in queue** — Cache check-in/checkout events in IndexedDB when offline (common in Tier-2/3 cities), sync on reconnect.
- **In-app training modules** — Short 2-min videos (lifting, fall prevention, dementia handling) tied to specializations. Also serves as onboarding for illiterate workers.

### Strategic
- **Earnings & payout dashboard** — Visits done × ₹/visit, bonus for 5★ ratings, transparent weekly payout. Retains caregivers in a high-churn market.
- **Certification tracker** — Upload ASHA / GNM certificates; auto-expire alerts; shareable public profile for families.
- **Route planner** — Auto-sequence day's visits by geography + traffic (Mapbox / Google Maps API). Saves 30–60 min per caregiver per day.

---

## 3. Family Portal

### Quick wins
- **Rate caregiver CTA** — Done (live on completed visits).
- **Weekly summary digest** — Every Sunday night: hours delivered, med-adherence %, mood trend, any concerns. Sent via WhatsApp + email.
- **NRI mode (timezone + INR↔USD/AUD toggle)** — Auto-detect TZ; show billing in foreign currency while paying in INR.
- **Appointment calendar (read-only)** — Already planned. Add "Request a visit change" button that notifies provider admin.

### Strategic
- **Care plan co-editing** — Family approves / suggests edits to the care plan the provider publishes. Gets skin in the game; reduces disputes.
- **Video call with caregiver during visit** — 30-sec "show me mom" video on demand (with consent). Huge trust multiplier for NRIs.
- **Baseline vs now health chart** — Already planned; extend with AI-written narrative ("Mom's mobility improved 15% since May").
- **Billing & invoice hub** — Monthly invoices, GST-compliant, downloadable. Integrate Razorpay for UPI autopay.

---

## 4. Provider Admin Portal

### Quick wins
- **Caregiver performance leaderboard** — Ratings, on-time %, visits completed. Monthly star employee badge.
- **Late / missed visit alerts** — Real-time feed when a scheduled visit hasn't been checked in 15 min past start. One-click reassign.
- **Bulk SMS/WhatsApp blast** — Festival greetings, health camps, new service announcements to all patients' families.

### Strategic
- **Revenue dashboard** — MRR, churn, ARPU per patient, payment failure reasons. Required for any serious B2B play.
- **Compliance / audit log viewer** — Every admin action (create patient, reassign caregiver, refund) stamped with who/when/what. Needed for hospital partners and insurance audits.
- **White-label subdomain** — Each hospital / agency gets `agency.healiox.in` with their logo. Accelerates distribution.
- **Insurance claim helper** — Auto-generate PMJAY / private insurance claim docs from visit logs + prescriptions.

---

## 5. Government / Ecosystem Portal (new tier)

Pitch this to state health departments, municipal corporations, and MoHFW:

- **Aggregate health map** — Anonymised heatmap of elder-health outcomes by district. Hypertension hotspots, fall-risk clusters, medication-adherence gaps.
- **ASHA worker integration** — ASHA workers become entry-level caregivers; platform gives them training + bonus for elder check-ins beyond their normal MCH duties.
- **Ayushman Bharat claim automation** — Providers submit claims through HealioX; state reimburses monthly.
- **PM-JAY elder package** — Lobby for an elder-specific package (₹50,000/year) that includes home care visits — HealioX becomes the default rail.

---

## 6. Cross-cutting / Platform

### Quick wins
- **Rate-limited public status page** — `/status` page showing uptime, last deploy. Trust signal for B2B buyers.
- **Audit log viewer** — Already seeded (`activity_log`). Add a filterable UI.
- **Data export per patient** — GDPR / DPDP Act compliance (India's new privacy law, effective 2025). One-click download of a patient's full history.

### Strategic
- **Offline-first PWA** — Installable, cached shell, background sync. Massive for rural caregivers.
- **WhatsApp Business API (not sandbox)** — Template messages pre-approved, higher throughput, official badge. Table stakes once you have >50 agencies.
- **AI quality auditor** — LLM reads caregiver notes nightly, flags inconsistencies (e.g., "patient walked 1km" but mobility assessment says "bed-ridden").
- **Clinical partner integrations** — Thyrocare / SRL for lab bookings, 1mg / PharmEasy for medicine refills. Revenue share on every order.

---

## Suggested Build Sequence (next 4 sprints)

| Sprint | Focus |
|--------|-------|
| 1 | Vernacular voice + medication reminder + WhatsApp weekly digest |
| 2 | Caregiver earnings dashboard + offline check-in queue + route planner |
| 3 | Admin performance leaderboard + late-visit alerts + white-label |
| 4 | NRI timezone mode + video-call-to-caregiver + AI quality auditor |

Every item above touches one of three moats:
1. **Distribution** (ASHA integration, Ayushman rails, white-label)
2. **Data** (aggregate health map, AI auditor, baseline-vs-now)
3. **Trust** (video-on-demand, audit log, compliance exports)

Ship for the moat, not the feature.
