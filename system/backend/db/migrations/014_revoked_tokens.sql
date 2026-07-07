-- Backs the JWT logout/denylist mechanism: JWTs are otherwise stateless, so there was
-- previously no way to invalidate a token before its natural expiry (logout was purely
-- client-side token removal). Each row marks one issued token (by its jti claim) as revoked
-- before its expiry. expires_at mirrors the token's own exp claim so expired rows can be
-- opportunistically cleaned up (a token past its exp is already rejected by signature/expiry
-- verification before the denylist is even checked, so rows past expires_at are dead weight,
-- not a correctness requirement).

create table revoked_tokens (
  jti text primary key,
  expires_at timestamptz not null,
  revoked_at timestamptz not null default now()
);

create index revoked_tokens_expires_at_idx on revoked_tokens (expires_at);
