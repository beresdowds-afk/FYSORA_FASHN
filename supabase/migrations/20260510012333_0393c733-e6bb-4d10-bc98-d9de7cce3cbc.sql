
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS hero_backdrop_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_backdrop_type TEXT NOT NULL DEFAULT 'image';

ALTER TABLE public.garment_catalog
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

ALTER TABLE public.tailor_catalogue_items
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'platform_settings_hero_backdrop_type_chk') THEN
    ALTER TABLE public.platform_settings
      ADD CONSTRAINT platform_settings_hero_backdrop_type_chk CHECK (hero_backdrop_type IN ('image','video'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'garment_catalog_media_type_chk') THEN
    ALTER TABLE public.garment_catalog
      ADD CONSTRAINT garment_catalog_media_type_chk CHECK (media_type IN ('image','video'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tailor_catalogue_items_media_type_chk') THEN
    ALTER TABLE public.tailor_catalogue_items
      ADD CONSTRAINT tailor_catalogue_items_media_type_chk CHECK (media_type IN ('image','video'));
  END IF;
END $$;
