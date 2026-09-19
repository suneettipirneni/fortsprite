CREATE OR REPLACE FUNCTION protect_last_fortsprite_passkey()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1 FROM "user" WHERE "id" = OLD."user_id" FOR UPDATE;

  -- Cascading account deletion has already removed the owning user from view.
  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  IF (SELECT count(*) FROM "passkey" WHERE "user_id" = OLD."user_id") <= 1 THEN
    RAISE EXCEPTION 'A FortSprite account must retain at least one passkey'
      USING ERRCODE = '23514';
  END IF;

  RETURN OLD;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "protect_last_fortsprite_passkey" ON "passkey";
--> statement-breakpoint
CREATE TRIGGER "protect_last_fortsprite_passkey"
BEFORE DELETE ON "passkey"
FOR EACH ROW
EXECUTE FUNCTION protect_last_fortsprite_passkey();
