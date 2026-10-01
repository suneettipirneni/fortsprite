CREATE TABLE "mcp_oauth_family" (
	"authorization_code_id" text PRIMARY KEY NOT NULL,
	"consent_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_oauth_family" ADD CONSTRAINT "mcp_oauth_family_consent_id_oauth_consent_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."oauth_consent"("id") ON DELETE cascade ON UPDATE no action;