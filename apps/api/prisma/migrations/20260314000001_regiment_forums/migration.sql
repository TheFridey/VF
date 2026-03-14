-- Add regiment field to veteran_details
-- Stores the regiment slug (e.g. '1-para', '22-sas') for forum access control and user counts.
ALTER TABLE "veteran_details" ADD COLUMN "regiment" TEXT;
CREATE INDEX "veteran_details_regiment_idx" ON "veteran_details"("regiment");

-- Add regiment + icon fields to forum_categories
-- regiment: slug of the owning regiment (NULL for BIA/BIA_PLUS tier categories)
-- icon:     lucide-react icon name for display
ALTER TABLE "forum_categories" ADD COLUMN "regiment" TEXT;
ALTER TABLE "forum_categories" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'MessageSquare';
CREATE INDEX "forum_categories_regiment_idx" ON "forum_categories"("regiment");
