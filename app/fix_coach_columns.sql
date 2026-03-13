-- Add 'specialty' column
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS specialty text;

-- Add 'pt_rate' column (Personal Training Rate)
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS pt_rate numeric DEFAULT 0;

-- Add 'salary' column
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS salary numeric DEFAULT 0;

-- Add 'avatar_url' column for the image
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add image positioning columns (for the round crop effect)
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS image_pos_x integer DEFAULT 50;

ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS image_pos_y integer DEFAULT 50;
