"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "./icons";

const plans = [
  {
    name: "Free",
    monthly: 0,
    yearly: 0,
    desc: "For individual affiliate creators testing their first deal campaigns.",
    cta: "Start free",
    href: "/signup",
    features: ["50 deal links", "Live click analytics", "Deal QR codes", "1 Deals Hub bio page", "bigsavingsdays.com domain", "Community support"],
  },
  {
    name: "Creator Pro",
    monthly: 499,
    yearly: 399,
    desc: "For Telegram channels, deal creators and publishers scaling clicks.",
    cta: "Get Creator Pro",
    href: "/contact",
    featured: true,
    features: ["5,000 deal links", "1 custom branded domain", "Deal expiry fallback redirects", "Coupon code copy badges", "CSV export", "Affiliate API access", "Priority support"],
  },
  {
    name: "Business / Network",
    monthly: 1499,
    yearly: 1199,
    desc: "For affiliate networks, agencies and high-volume deal syndicates.",
    cta: "Talk to us",
    href: "/contact",
    features: ["1,000,000 deal links", "10 custom domains", "Automated affiliate tag injection", "Bulk CSV import & API", "Real-time webhook feeds", "Priority 24/7 support"],
  },
];

export function PricingPlans({ compact = false }: { compact?: boolean }) {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="row-between" style={{ alignItems: "flex-end", marginBottom: 26, flexWrap: "wrap", gap: 16 }}>
        <div>
          {!compact && (
            <>
              <span className="kicker">Pricing</span>
              <h2>Priced for momentum.</h2>
              <p className="section-sub">Start free. Upgrade when the numbers say so. No setup fees, no per-seat surprises.</p>
            </>
          )}
        </div>
        <div className="pricing-toggle" role="group" aria-label="Billing period">
          <button type="button" className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Monthly</button>
          <button type="button" className={yearly ? "active" : ""} onClick={() => setYearly(true)}>Yearly · save 20%</button>
        </div>
      </div>

      <div className="plans">
        {plans.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <div key={plan.name} className={`plan${plan.featured ? " plan-featured" : ""}`}>
              {plan.featured && <span className="badge badge-lime plan-tag">Most popular</span>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-price">
                <span className="amount">{price === 0 ? "₹0" : `₹${price.toLocaleString("en-IN")}`}</span>
                <small>/ month{yearly && price > 0 ? ", billed yearly" : ""}</small>
              </div>
              <p className="plan-desc">{plan.desc}</p>
              <div className="plan-features">
                {plan.features.map((f) => (
                  <div key={f} className="plan-feature"><Check /><span>{f}</span></div>
                ))}
              </div>
              <Link href={plan.href} className={`btn ${plan.featured ? "btn-lime" : "btn-ghost"} btn-block`}>{plan.cta}</Link>
            </div>
          );
        })}
      </div>
      <p className="center small muted mt-16">
        Prices in INR. Billing is handled by the operator, so plan changes go through support for now. Need invoices or a custom SLA? <Link href="/contact" style={{ textDecoration: "underline" }}>Talk to us</Link>.
      </p>
    </div>
  );
}
