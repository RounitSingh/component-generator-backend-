ALTER TABLE "chat_messages" ALTER COLUMN "message_type" SET DATA TYPE varchar(500);--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "message_type" SET DEFAULT 'text';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar_url";