import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="BigSavingsDays home">
      <span className="brand-mark" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Price / Discount Tag */}
          <path d="M3.8 10.8L10.8 3.8H18.2C19.2 3.8 20 4.6 20 5.6V13C20 13.5 19.8 14 19.4 14.4L12.4 21.4C11.6 22.2 10.4 22.2 9.6 21.4L3.8 15.6C3 14.8 3 13.6 3.8 12.8L3.8 10.8Z" />
          {/* Tag Eyelet */}
          <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" />
          {/* Deal Lightning Spark */}
          <path d="M12.5 6.5L8.5 12.5H12L10.5 17.5L16 11.5H12.5L13.5 6.5H12.5Z" fill="var(--deal-orange)" stroke="none" />
        </svg>
      </span>
      <span className="brand-text">
        BigSavings<span className="brand-days">Days</span><span className="brand-tld">.com</span>
      </span>
    </Link>
  );
}
