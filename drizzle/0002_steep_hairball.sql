CREATE TABLE "ai_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"conversation_id" varchar(255) NOT NULL,
	"user_message_id" integer,
	"prompt_text" text NOT NULL,
	"response_text" text NOT NULL,
	"model_name" varchar(100) DEFAULT 'gemini',
	"response_time_ms" integer,
	"tokens_used" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"conversation_id" varchar(255) NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now(),
	"message_count" integer DEFAULT 0,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD COLUMN "conversation_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD COLUMN "related_message_id" integer;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "conversation_id" varchar(255);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "message_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_user_message_id_chat_messages_id_fk" FOREIGN KEY ("user_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_related_message_id_chat_messages_id_fk" FOREIGN KEY ("related_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE no action ON UPDATE no action;