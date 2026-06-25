-- Message pins: free, expressive emoji + message pins (the viral engine).
-- Reuses the existing globe_pins table via a `kind` discriminator so that the
-- existing GET / globe-render / popup paths handle both kinds with one query.
--
--   kind = 'message'  → emoji + message      (free, sharable)
--   kind = 'business' → business_name + url   (existing promo pins, → premium)

ALTER TABLE globe_pins
  ADD COLUMN IF NOT EXISTS kind    text NOT NULL DEFAULT 'business',
  ADD COLUMN IF NOT EXISTS emoji   text,
  ADD COLUMN IF NOT EXISTS message text;

-- business_name was mandatory for promo pins; message pins don't have one.
ALTER TABLE globe_pins ALTER COLUMN business_name DROP NOT NULL;

-- kind must be one of the two known values
DO $$ BEGIN
  ALTER TABLE globe_pins
    ADD CONSTRAINT globe_pins_kind_check CHECK (kind IN ('business', 'message'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- each kind must carry its own required content
DO $$ BEGIN
  ALTER TABLE globe_pins ADD CONSTRAINT globe_pins_content_check CHECK (
    (kind = 'message'  AND message IS NOT NULL) OR
    (kind = 'business' AND business_name IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_globe_pins_kind ON globe_pins (kind);
