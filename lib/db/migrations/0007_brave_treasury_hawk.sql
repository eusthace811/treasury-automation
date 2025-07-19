CREATE TABLE IF NOT EXISTS "Treasury_Rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"original" text NOT NULL,
	"ruleData" json NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"userId" uuid NOT NULL,
	"memo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Treasury_Rule" ADD CONSTRAINT "Treasury_Rule_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;