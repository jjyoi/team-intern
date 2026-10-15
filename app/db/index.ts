import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Build the app and apply the local migration before starting the preview.',
    );
  }

  return drizzle(env.DB, { schema });
}
