CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "business_listing_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL,
    "location" TEXT,
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "job_listing_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "cv_public_id" TEXT NOT NULL,
    "cv_file_name" TEXT NOT NULL,
    "cv_mime_type" TEXT NOT NULL,
    "cv_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_listings_business_listing_id_is_active_idx" ON "job_listings"("business_listing_id", "is_active");
CREATE INDEX "job_listings_created_at_idx" ON "job_listings"("created_at");
CREATE INDEX "job_applications_job_listing_id_created_at_idx" ON "job_applications"("job_listing_id", "created_at");
CREATE INDEX "job_applications_applicant_id_idx" ON "job_applications"("applicant_id");

ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_business_listing_id_fkey"
FOREIGN KEY ("business_listing_id") REFERENCES "business_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_listing_id_fkey"
FOREIGN KEY ("job_listing_id") REFERENCES "job_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_applicant_id_fkey"
FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
