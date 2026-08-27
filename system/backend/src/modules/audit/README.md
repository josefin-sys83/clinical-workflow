# Audit trail

The audit trail is one append-only PostgreSQL stream for platform, company, and
project activity. Redis or process memory must not be used as the source of
truth for audit evidence.

## Scopes

- `system`: platform-owner activity with no tenant, such as superadmin changes.
- `company`: authentication, user management, settings, subscriptions, and
  support activity belonging to one company.
- `project`: workflow, requirement, protocol, report, document, signature, and
  other activity belonging to one project and its owning company.

`company_id` is stored directly on every company/project event. API reads never
trust a company ID from a normal user: `AuditService.listVisibleTo()` replaces it
with the company ID from the verified JWT. Superadmins are the only callers that
can query across companies.

## Recording an event

Use a stable dotted action code and a sentence that is understandable without
opening the metadata:

```ts
await audit.record({
  companyId,
  type: 'user.role.changed',
  message: `Changed ${user.name}'s role to ${user.system_role}`,
  entityType: 'user',
  entityId: user.id,
  entityLabel: user.name,
  actor: req.user,
  metadata: { role: user.system_role },
});
```

For a database mutation that already uses a transaction, pass its `PoolClient`:

```ts
await audit.record(event, client);
```

This makes the mutation and audit insert commit or roll back together. Never
catch and ignore an audit error around a state-changing operation.

## Readability and history

The row stores snapshots of actor, company, project, and entity names. This is
intentional: rendering a historical event by joining only to current tables
would make old entries change when records are renamed and become unreadable
when records are deleted.

Do not store passwords, tokens, document bodies, private keys, or other secrets
in `message` or `metadata`. Prefer IDs, field names, states, reasons, hashes, and
short labels.

The migration installs a database trigger that rejects `UPDATE` and `DELETE` on
`audit_event`. Corrections must be represented by a new event, never by rewriting
history.
