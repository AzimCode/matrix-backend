-- Optional phone number on the contact form, for people who would rather be
-- called back than emailed. Nullable so existing messages stay valid.
ALTER TABLE "contact_messages" ADD COLUMN "phone" TEXT;
