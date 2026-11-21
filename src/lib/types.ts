export type LinkRow = {
  id: string;
  user_id: string;
  domain_id: string | null;
  slug: string;
  url: string;
  title: string;
  tags: string;
  password_hash: string | null;
  expires_at: number | null;
  click_limit: number | null;
  active: number;
  created_at: number;
  updated_at: number;
  domain_host?: string | null;
  clicks?: number;
};

export type ClickRow = {
  id: number;
  link_id: string;
  ts: number;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  ip_hash: string;
};

export type PageRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  bio: string;
  theme: string;
  avatar_color: string;
  created_at: number;
};

export type PageLinkRow = {
  id: string;
  page_id: string;
  label: string;
  url: string;
  sort_order: number;
  clicks: number;
};

export type DomainRow = {
  id: string;
  user_id: string;
  hostname: string;
  status: string;
  verification_token: string;
  created_at: number;
};

export type ApiKeyRow = {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  last_used_at: number | null;
  created_at: number;
};
