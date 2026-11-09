CREATE TYPE "public"."brand_alias_status" AS ENUM('confirmed', 'pending');--> statement-breakpoint
CREATE TABLE "brand_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" text NOT NULL,
	"normalized" text NOT NULL,
	"brand_code" text,
	"status" "brand_alias_status" DEFAULT 'confirmed' NOT NULL,
	"suggested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_aliases_normalized_unique" UNIQUE("normalized")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"code" text PRIMARY KEY NOT NULL,
	"short" text,
	"name" text NOT NULL,
	"drive_folder_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_aliases" ADD CONSTRAINT "brand_aliases_brand_code_brands_code_fk" FOREIGN KEY ("brand_code") REFERENCES "public"."brands"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_aliases_brand_code_idx" ON "brand_aliases" USING btree ("brand_code");