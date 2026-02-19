export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  name: string;
  company_name: string;
  business_logo_url: string | null;
  business_address: string;
  business_website: string;
  apply_branding: boolean;
  category_id: string | null;
  is_admin: boolean;
  token_balance: number;
  studio_free_used: number;
  allowed_sections: string[];
  subscription_plan: string;
  daily_reward_claimed_at: string | null;
}

export interface ImageResult {
  base64: string;
  mime_type: string;
  label: string;
}

export interface GenerateResponse {
  success: boolean;
  images: ImageResult[];
  error?: string;
  credits_remaining?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
}

export interface FeedItem {
  id: string;
  category_id: string;
  title: string;
  before_image_url: string;
  after_image_url: string;
  item_type: string;
  tags: string[];
}

export interface Plan {
  id: string;
  name: string;
  type: string;
  price_inr: number;
  tokens: number;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  project_type: string;
  category_id: string | null;
  created_at: string;
  images: { id: string; label: string; storage_path: string; created_at: string }[];
}

export interface AiModel {
  id: string;
  name: string;
  gender: string;
  age_group: string;
  thumbnail_url: string;
}
