CREATE TABLE "public_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"label" text,
	"created_by_email" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "public_link_id" uuid;--> statement-breakpoint
CREATE INDEX "public_links_owner_idx" ON "public_links" USING btree ("created_by_email","created_at");--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_public_link_id_public_links_id_fk" FOREIGN KEY ("public_link_id") REFERENCES "public"."public_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "requests_public_link_idx" ON "requests" USING btree ("public_link_id");