import { getPool } from '../../db/pg';
import type { PoolClient } from 'pg';

export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;
  const { rows } = await getPool().query('select 1 from revoked_tokens where jti = $1', [jti]);
  return rows.length > 0;
}

export async function revokeToken(jti: string, expiresAtUnixSeconds: number, client: PoolClient): Promise<void> {
  await client.query(
    `insert into revoked_tokens (jti, expires_at) values ($1, to_timestamp($2)) on conflict (jti) do nothing`,
    [jti, expiresAtUnixSeconds],
  );
  // Opportunistic cleanup of rows for tokens that have since expired naturally — they're
  // already rejected by signature/expiry verification before the denylist check ever runs,
  // so keeping them around serves no purpose beyond bloating the table.
  await client.query('delete from revoked_tokens where expires_at < now()');
}
