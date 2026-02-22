-- Add batch_description column to batch_listings
-- Stores the user-provided product type (e.g. "Bracelet", "Anklet")
-- that is injected into the AI prompt to prevent product misclassification.

alter table public.batch_listings
  add column if not exists batch_description text not null default '';
