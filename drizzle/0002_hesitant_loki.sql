CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_slug_idx" ON "share_links" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "share_links_snapshot_id_idx" ON "share_links" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "share_links_expires_at_idx" ON "share_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "share_links_revoked_at_idx" ON "share_links" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "snapshots_owner_id_idx" ON "snapshots" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "snapshots_conversation_id_idx" ON "snapshots" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "snapshots_component_id_idx" ON "snapshots" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "snapshots_created_at_idx" ON "snapshots" USING btree ("created_at");