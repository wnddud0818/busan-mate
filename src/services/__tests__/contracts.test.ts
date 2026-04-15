import { readFileSync } from "fs";
import { join } from "path";

describe("backend contracts", () => {
  it("defines client id sync columns, JWT-protected write functions, and owner RLS policies", () => {
    const initMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260406190000_init.sql"),
      "utf-8"
    );
    const remoteSyncMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260415170000_remote_sync.sql"),
      "utf-8"
    );
    const functionConfig = readFileSync(join(process.cwd(), "supabase", "config.toml"), "utf-8");

    expect(initMigration).toContain('create policy "itineraries_owner_select"');
    expect(initMigration).toContain('create policy "shared_itineraries_public_select"');
    expect(initMigration).toContain("alter table public.itineraries enable row level security");

    expect(remoteSyncMigration).toContain("add column if not exists client_id text");
    expect(remoteSyncMigration).toContain("add column if not exists current_day int not null default 1");
    expect(remoteSyncMigration).toContain('create policy "profiles_owner_insert"');
    expect(remoteSyncMigration).toContain('create policy "trip_sessions_owner_update"');
    expect(remoteSyncMigration).toContain('create policy "chat_messages_owner_insert"');

    expect(functionConfig).toContain("[functions.publish-itinerary]");
    expect(functionConfig).toContain("[functions.answer-guide]");
    expect(functionConfig).toContain("[functions.ingest-location-event]");
    expect(functionConfig).toContain("[functions.rate-itinerary]");
    expect(functionConfig).toContain("verify_jwt = true");
  });
});
