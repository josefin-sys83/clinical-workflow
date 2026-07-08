import { Pool } from 'pg';

let pool: Pool | null = null;

// Explicit pool sizing, not pg's bare defaults (max=10, idleTimeoutMillis=10000, no
// connectionTimeoutMillis) — sized per BACKEND INSTANCE. Load testing never needed more
// than 10 connections even at 200 concurrent HTTP requests, so `max` here already has
// headroom for today; the real reason to be explicit is running MULTIPLE instances later,
// since each instance gets its own independent pool — total connections against the
// database becomes (max × instance count). At max=15, up to ~6 instances stays comfortably
// under Neon's reported max_connections (901) with wide margin for other clients/admin
// connections — but that raw Postgres setting isn't necessarily the effective concurrent
// session limit enforced by the pooler endpoint (the `-pooler` host in DATABASE_URL), so
// confirm the actual plan-level limit before scaling to many instances.
const POOL_MAX = 15;
const POOL_MIN = 2; // small warm baseline so the first request after idle isn't paying full connection-establishment latency
const POOL_IDLE_TIMEOUT_MS = 30_000; // long enough to avoid churn from bursty-but-not-continuous traffic
// Load testing found requests block on getPool().connect()/query() with NO bound at all
// when the pool is saturated (pg's default connectionTimeoutMillis is 0 = wait forever) —
// the same unbounded-hang risk as the AI timeout fix, just on the DB side. Fail clearly
// after 10s instead.
const POOL_CONNECTION_TIMEOUT_MS = 10_000;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString,
      max: POOL_MAX,
      min: POOL_MIN,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
    });
  }
  return pool;
}
