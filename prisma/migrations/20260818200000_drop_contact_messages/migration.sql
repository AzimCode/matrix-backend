-- Drops the contact form and everything that stored its submissions.
--
-- The public form is gone from the site; visitors reach out through the links
-- the profile already publishes (email, telegram, github, ...), so nothing
-- writes to these tables any more.

-- Analytics rows tagged CONTACT_SUBMIT have to go before the enum is rebuilt:
-- the USING cast below re-reads every existing value, and a row still holding
-- the removed label would abort the whole migration.
DELETE FROM "analytics_events" WHERE "event" = 'CONTACT_SUBMIT';

-- AlterEnum
BEGIN;
CREATE TYPE "AnalyticsEventType_new" AS ENUM ('PAGE_VIEW', 'PROJECT_VIEW', 'CV_DOWNLOAD');
ALTER TABLE "analytics_events" ALTER COLUMN "event" TYPE "AnalyticsEventType_new" USING ("event"::text::"AnalyticsEventType_new");
ALTER TYPE "AnalyticsEventType" RENAME TO "AnalyticsEventType_old";
ALTER TYPE "AnalyticsEventType_new" RENAME TO "AnalyticsEventType";
DROP TYPE "AnalyticsEventType_old";
COMMIT;

-- DropTable
DROP TABLE "contact_messages";

-- DropEnum
DROP TYPE "ContactMessageStatus";
