import { readFileSync } from "fs";
import { join } from "path";

describe("backend contracts", () => {
  it("defines public sharing and owner RLS policies", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260406190000_init.sql"),
      "utf-8"
    );

    expect(migration).toContain('create policy "itineraries_owner_select"');
    expect(migration).toContain('create policy "shared_itineraries_public_select"');
    expect(migration).toContain("alter table public.itineraries enable row level security");
  });
});
