/**
 * Data access layer. The UI talks to this interface only; the
 * implementation is chosen by DEMO_MODE. `demo` serves the seeded
 * project from memory; `supabase` (activated when credentials exist)
 * reads the same shapes from Postgres with RLS enforcing ownership.
 */

import { isDemoMode } from "../config";
import type { DataSource } from "./types";
import { demoDataSource } from "./demo";
import { supabaseDataSource } from "./supabase";

export function getDataSource(): DataSource {
  return isDemoMode() ? demoDataSource : supabaseDataSource;
}

export type { DataSource } from "./types";
