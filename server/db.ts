import { neon } from '@neondatabase/serverless';

const env = (key: string) => (process.env[key] || '').trim();

let warnedMock = false;

export function getDatabaseUrl(): string {
  return env('POSTGRES_URL') || env('DATABASE_URL') || env('NEON_DATABASE_URL');
}

export function hasDatabaseConfig(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getDb(): any {
  const url = getDatabaseUrl();
  if (url) {
    return neon(url);
  }
  if (!warnedMock) {
    warnedMock = true;
    console.warn('[AI Studio] Database not connected — mock active. Set DATABASE_URL or POSTGRES_URL to connect PostgreSQL.');
  }
  return async () => [];
}
