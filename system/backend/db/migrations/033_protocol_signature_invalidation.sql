-- A signature approves one specific version of a document. When a document out for
-- signature is sent back for changes, its signatures are marked invalid rather than
-- deleted, so the record of who signed what, and when, is kept.
alter table protocol_signature
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_reason text;
