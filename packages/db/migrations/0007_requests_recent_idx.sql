DROP INDEX "requests_requester_email_idx";--> statement-breakpoint
CREATE INDEX "requests_requester_recent_idx" ON "requests" USING btree ("requester_email","updated_at");--> statement-breakpoint
CREATE INDEX "requests_submitter_recent_idx" ON "requests" USING btree ("submitted_by_email","updated_at");