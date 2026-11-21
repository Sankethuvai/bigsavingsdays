import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const ArrowRight = (p: P) => (<svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const ArrowUpRight = (p: P) => (<svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>);
export const ArrowUp = (p: P) => (<svg {...base(p)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>);
export const LinkIcon = (p: P) => (<svg {...base(p)}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>);
export const Chart = (p: P) => (<svg {...base(p)}><path d="M3 3v18h18" /><path d="M7 15l4-5 3 3 5-7" /></svg>);
export const Qr = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 18v3h-3" /></svg>);
export const Globe = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>);
export const Code = (p: P) => (<svg {...base(p)}><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></svg>);
export const Shield = (p: P) => (<svg {...base(p)}><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>);
export const Zap = (p: P) => (<svg {...base(p)}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>);
export const Check = (p: P) => (<svg {...base(p)}><path d="m4 12 5 5L20 6" /></svg>);
export const Copy = (p: P) => (<svg {...base(p)}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>);
export const Trash = (p: P) => (<svg {...base(p)}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></svg>);
export const Edit = (p: P) => (<svg {...base(p)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>);
export const Search = (p: P) => (<svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const Menu = (p: P) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const Sun = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>);
export const Moon = (p: P) => (<svg {...base(p)}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" /></svg>);
export const Plus = (p: P) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const Eye = (p: P) => (<svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const Users = (p: P) => (<svg {...base(p)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></svg>);
export const Settings = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>);
export const Logout = (p: P) => (<svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>);
export const Layout = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>);
export const Sparkles = (p: P) => (<svg {...base(p)}><path d="m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>);
export const Funnel = (p: P) => (<svg {...base(p)}><path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" /></svg>);
export const Clock = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
export const Lock = (p: P) => (<svg {...base(p)}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
export const Download = (p: P) => (<svg {...base(p)}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>);
export const Mail = (p: P) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>);
export const Telegram = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 12.6l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.3Z" /></svg>);
export const Instagram = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>);
export const Github = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.3-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.5.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.7 1 .7 2v3c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" /></svg>);
export const XSocial = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M17.5 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.4L5.2 21H2l7.3-8.3L1.7 3h6.4l4.5 5.9L17.5 3Zm-1.1 16h1.7L7.5 4.8H5.7L16.4 19Z" /></svg>);
export const Youtube = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M23 12s0-3.4-.4-5a2.6 2.6 0 0 0-1.8-1.8C19.2 4.8 12 4.8 12 4.8s-7.2 0-8.8.4A2.6 2.6 0 0 0 1.4 7C1 8.6 1 12 1 12s0 3.4.4 5a2.6 2.6 0 0 0 1.8 1.8c1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-5 .4-5ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z" /></svg>);
export const Info = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 16v-5M12 8h.01" /></svg>);
export const Filter = (p: P) => (<svg {...base(p)}><path d="M3 5h18M6 12h12M10 19h4" /></svg>);
export const Shopify = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M16.5 4.4c-.2-.1-.6 0-.8 0l-1 .3c-.3-.8-1-1.8-2.2-1.8h-.1c-.3-.4-.7-.6-1.1-.6C8.9 2.3 7.7 5 7.3 6.4l-2 .6c-.6.2-.7.2-.8.8L3 20l13 2 4-20-3.5 2.4ZM12 4.2c.4 0 .7.2.9.6-.6.2-1.3.5-1.9 1 .3-1 .9-1.6 1-1.6Zm-1.8.7c.2-.5.5-1 .9-1-.2.6-.4 1.3-.4 2.1l-1.4.4c.2-.5.5-1.1.9-1.5Z" /></svg>);
export const Grid = (p: P) => (<svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
export const Key = (p: P) => (<svg {...base(p)}><circle cx="7.5" cy="15.5" r="4.5" /><path d="m11 12 9-9M17 6l3 3M14 9l3 3" /></svg>);
export const Block = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m5.5 5.5 13 13" /></svg>);
export const X = (p: P) => (<svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>);
export const Trend = (p: P) => (<svg {...base(p)}><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>);
