# Multi-Tenant SaaS Platform

A comprehensive UX3 application demonstrating enterprise-grade tenant management, role-based access control (RBAC), billing orchestration, and operational dashboards. This example showcases how **configuration-driven FSM development** scales to complex business domains.

## Quick Start

```bash
cd examples/tenant.saas
ux3 dev
```

Open [localhost:5173](http://localhost:5173). The inspector panel (bottom-right) shows running FSM states and service calls across the multi-tenant hierarchy.

---

## Architecture Overview

**tenant.saas** is a multi-tenant SPA where each organization operates within an isolated context, with fine-grained permission boundaries and audit trails. All business logic—from tenant provisioning to subscription lifecycle—is modeled as state machines.

### Core Entity FSMs

| Entity | Purpose | FSM States | Key Transitions |
|--------|---------|-----------|-----------------|
| **Organization** | Tenant boundary + workspace | `provisioning` → `active` → `suspended` → `archived` | Upgrade plan, suspend for non-payment, sunset old accounts |
| **Membership** | User + Org binding + Role | `pending_invite` → `active` → `role_change` → `deactivated` | Accept invite, change role, offboard |
| **Role** | Permission definition (RBAC) | `draft` → `active` → `deprecated` → `deleted` | Assign permissions, retire, soft-delete |
| **Team** | Org subdivision + ownership | `creating` → `active` → `managed` → `archived` | Transfer ownership, merge teams, archive |
| **Subscription** | Billing entity + plan lifecycle | `trial` → `active` → `past_due` → `cancelled` | Upgrade/downgrade, retry failed payment, churn recovery |
| **Audit Log** | Compliance + forensics | `created` → `indexed` → `archived` | Query trails, export for compliance, retention policies |
| **Workspace Settings** | Org configuration + preferences | `loading` → `viewing` → `editing` → `saving` → `success`/`error` | Update branding, email policies, integrations |

---

## Declarative Configuration Patterns

### Project Configuration (`ux/ux3.yaml`)

```yaml
name: tenant.saas
index: view/index.yaml
domain: 'tenants.cloud'

plugins:
  - name: '@ux3/plugin-tailwind-plus'
    config:
      css: 'https://cdn.tailwindcss.com'
  - name: '@ux3/plugin-stripe'
    config:
      apiKey: '{{ env.STRIPE_PUBLISHABLE_KEY }}'
  - name: '@ux3/plugin-sentry'
    config:
      dsn: '{{ env.SENTRY_DSN }}'

secrets:
  TENANT_API_KEY: "{{ env.TENANT_API_KEY }}"
  JWT_SECRET: "{{ env.JWT_SECRET }}"

runtime:
  bundleKey: "tenant.saas"
  hydrationFn: "initMultiTenant"

development:
  hot-reload: true
  logging: "debug"
  inspector: true
```

### Service Configuration (`ux/service/services.yaml`)

```yaml
services:
  # Organization & tenant management API
  org-service:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1/orgs'
    auth:
      type: bearer
      token: '{{ secrets.TENANT_API_KEY }}'
    headers:
      X-Tenant-ID: '{{ ctx.tenantId }}'

  # Stripe billing + subscription service
  stripe:
    adapter: jsonrpc
    endpoint: 'http://localhost:3001/api/v1/billing/stripe'
    auth:
      type: bearer
      token: '{{ secrets.TENANT_API_KEY }}'

  # Audit log streaming service
  audit:
    adapter: websocket
    url: 'ws://localhost:3001/api/v1/audit/stream'
    auth:
      type: bearer
      token: '{{ secrets.TENANT_API_KEY }}'
    reconnectAttempts: 5

  # RBAC permission cache
  rbac:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1/rbac'
    caching:
      enabled: true
      ttl: 300  # 5 min cache on permission checks

  # User directory service
  users:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1/users'
    auth:
      type: bearer
      token: '{{ secrets.TENANT_API_KEY }}'
```

---

## View State Machines

### Organization Management (`ux/view/organization.yaml`)

- the status of the org is it's state.

```yaml
name: organization
layout: admin
initial: loading

context:
  org:
    id: null
    name: "default org"
    plan: "starter"
    createdAt: null
  error: null
  unsavedChanges: false

states:
  loading:
    template: 'view/organization/loading.html'
    invoke:
      service: org-service
      method: getOrganization
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.org = event.data; }
      ERROR:
        target: error
        action: (ctx, event) => { ctx.error = event.message; }

  viewing:
    template: 'view/organization/viewing.html'
    on:
      EDIT: editing
      UPGRADE_PLAN:
        target: upgrading
        guard: (ctx) => ctx.org.status === 'active'
      EXPORT_SETTINGS: { target: exporting }
      REFRESH: loading

  editing:
    template: 'view/organization/editing.html'
    on:
      SAVE:
        target: saving
        guard: (ctx) => ctx.unsavedChanges
        action: (ctx, event) => { ctx.unsavedChanges = false; }
      CANCEL: viewing
      CHANGE_VALUE:
        target: editing
        action: (ctx, event) => { ctx.org[event.field] = event.value; ctx.unsavedChanges = true; }

  saving:
    invoke:
      service: org-service
      method: updateOrganization
      input: '{{ ctx.org }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.org = event.data; }
      ERROR:
        target: editing
        action: (ctx, event) => { ctx.error = event.message; }

  upgrading:
    template: 'view/organization/upgrading.html'
    invoke:
      service: stripe
      method: initiatePlanUpgrade
      input: '{{ ctx.org.id }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.org.plan = event.newPlan; }
      ERROR:
        target: viewing
        action: (ctx, event) => { ctx.error = event.message; }

  exporting:
    invoke:
      service: org-service
      method: exportSettings
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { /* trigger download */ }
      ERROR:
        target: viewing

  error:
    template: 'view/organization/error.html'
    on:
      RETRY: loading
      DISMISS: viewing
```

### Membership & Invitations (`ux/view/membership.yaml`)

```yaml
name: membership
layout: admin
initial: loading

context:
  members: []
  pendingInvites: []
  selectedMember: null
  newInviteEmail: ""
  selectedRole: "viewer"
  error: null

states:
  loading:
    invoke:
      service: org-service
      method: getMembers
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.members = event.members;
            ctx.pendingInvites = event.pendingInvites;
          }
      ERROR:
        target: error

  viewing:
    template: 'view/membership/viewing.html'
    on:
      INVITE_USER: inviting
      CHANGE_ROLE: changing_role
      REVOKE_INVITE: revoking
      DEACTIVATE_MEMBER: deactivating
      REFRESH: loading

  inviting:
    template: 'view/membership/inviting.html'
    on:
      SEND_INVITE:
        target: processing_invite
        guard: |
          (ctx, event) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(event.email);
          }
      CANCEL: viewing

  processing_invite:
    invoke:
      service: org-service
      method: inviteMember
      input: '{{ { email: ctx.newInviteEmail, role: ctx.selectedRole } }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.pendingInvites.push(event.invite); }
      ERROR:
        target: inviting
        action: (ctx, event) => { ctx.error = event.message; }

  changing_role:
    template: 'view/membership/changing_role.html'
    on:
      CONFIRM_ROLE_CHANGE:
        target: updating_role
      CANCEL: viewing

  updating_role:
    invoke:
      service: org-service
      method: updateMemberRole
      input: '{{ { memberId: ctx.selectedMember.id, role: ctx.selectedRole } }}'
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            const idx = ctx.members.findIndex(m => m.id === ctx.selectedMember.id);
            if (idx >= 0) ctx.members[idx].role = event.newRole;
          }
      ERROR:
        target: changing_role

  deactivating:
    invoke:
      service: org-service
      method: deactivateMember
      input: '{{ ctx.selectedMember.id }}'
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.members = ctx.members.filter(m => m.id !== ctx.selectedMember.id);
          }
      ERROR:
        target: viewing

  revoking:
    invoke:
      service: org-service
      method: revokeInvite
      input: '{{ ctx.selectedMember.id }}'
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.pendingInvites = ctx.pendingInvites.filter(i => i.id !== ctx.selectedMember.id);
          }
      ERROR:
        target: viewing

  error:
    on:
      RETRY: loading
      DISMISS: viewing
```

### Subscription & Billing (`ux/view/subscription.yaml`)

```yaml
name: subscription
layout: admin
initial: loading

context:
  subscription:
    id: null
    plan: "starter"
    status: "active"  # active, past_due, cancelled, trialing
    currentPeriodEnd: null
    nextBillingDate: null
  paymentMethod: null
  invoices: []
  error: null

states:
  loading:
    invoke:
      service: stripe
      method: getSubscription
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.subscription = event.subscription;
            ctx.paymentMethod = event.paymentMethod;
            ctx.invoices = event.invoices;
          }
      ERROR:
        target: error

  viewing:
    template: 'view/subscription/viewing.html'
    on:
      OPEN_UPGRADE: upgrade_choosing_plan
      OPEN_DOWNGRADE: downgrade_choosing_plan
      MANAGE_PAYMENT: managing_payment
      OPEN_INVOICES: viewing_invoices
      CANCEL_SUBSCRIPTION: confirming_cancellation

  upgrade_choosing_plan:
    template: 'view/subscription/upgrade_choosing_plan.html'
    on:
      SELECT_PLAN:
        target: confirming_upgrade
        action: (ctx, event) => { ctx.newPlan = event.plan; }
      CANCEL: viewing

  confirming_upgrade:
    template: 'view/subscription/confirming_upgrade.html'
    on:
      CONFIRM:
        target: processing_upgrade
      CANCEL: upgrade_choosing_plan

  processing_upgrade:
    invoke:
      service: stripe
      method: upgradeSubscription
      input: '{{ { newPlan: ctx.newPlan } }}'
    on:
      SUCCESS:
        target: upgrade_complete
        action: (ctx, event) => { ctx.subscription = event.updatedSubscription; }
      ERROR:
        target: viewing

  upgrade_complete:
    template: 'view/subscription/upgrade_complete.html'
    on:
      DONE: viewing

  # ... similar patterns for downgrade, payment management, cancellation

  managing_payment:
    template: 'view/subscription/managing_payment.html'
    on:
      UPDATE_PAYMENT:
        target: updating_payment
      VIEW_PAYMENT_HISTORY: viewing_invoices
      CANCEL: viewing

  updating_payment:
    invoke:
      service: stripe
      method: updatePaymentMethod
      input: '{{ ctx.paymentMethod }}'
    on:
      SUCCESS:
        target: managing_payment
      ERROR: managing_payment

  viewing_invoices:
    template: 'view/subscription/viewing_invoices.html'
    on:
      BACK: viewing

  confirming_cancellation:
    template: 'view/subscription/confirming_cancellation.html'
    on:
      CONFIRM:
        target: cancelled_processing
      CANCEL: viewing

  cancelled_processing:
    invoke:
      service: stripe
      method: cancelSubscription
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.subscription.status = 'cancelled'; }

  error:
    on:
      RETRY: loading
```

### Audit Trail (`ux/view/audit-log.yaml`)

```yaml
name: audit
layout: admin
initial: loading

context:
  events: []
  filters:
    entityType: null
    action: null
    dateFrom: null
    dateTo: null
  isFiltering: false
  error: null

states:
  loading:
    invoke:
      service: audit
      method: getEvents
      input: '{{ { limit: 50, filters: ctx.filters } }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.events = event.events; }
      ERROR:
        target: error

  viewing:
    template: 'view/audit-log/viewing.html'
    on:
      OPEN_FILTERS: filtering
      EXPORT_LOG:
        target: exporting
      EVENT_DETAIL:
        target: viewing_event_detail
      REFRESH: loading

  filtering:
    template: 'view/audit-log/filtering.html'
    on:
      APPLY_FILTERS:
        target: loading
        action: (ctx, event) => { ctx.filters = event.filters; }
      CANCEL: viewing

  viewing_event_detail:
    template: 'view/audit-log/event_detail.html'
    on:
      CLOSE: viewing
      DOWNLOAD_EVENT: exporting

  exporting:
    invoke:
      service: audit
      method: exportEvents
      input: '{{ ctx.filters }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { /* trigger CSV download */ }
      ERROR:
        target: viewing

  error:
    on:
      RETRY: loading
```

---

## i18n Strings (`ux/i18n/`)

Organize translations by entity FSM:

```
ux/i18n/
├── en.json
├── es.json
└── fr.json
```

**en.json** excerpt:

```json
{
  "organization": {
    "title": "Organization Settings",
    "loading": { "label": "Loading organization..." },
    "viewing": {
      "label": "Organization",
      "editButton": "Edit Settings",
      "upgradeButton": "Upgrade Plan",
      "exportButton": "Export Configuration"
    },
    "editing": {
      "label": "Edit Organization",
      "saveButton": "Save Changes",
      "cancelButton": "Cancel"
    }
  },
  "membership": {
    "title": "Team Members",
    "inviteButton": "Invite Member",
    "pendingInvites": "Pending Invites",
    "roles": {
      "admin": "Administrator (full access)",
      "editor": "Editor (manage content & members)",
      "viewer": "Viewer (read-only access)"
    }
  },
  "subscription": {
    "title": "Billing & Subscription",
    "plans": {
      "starter": "Starter - $29/mo",
      "professional": "Professional - $79/mo",
      "enterprise": "Enterprise - Custom"
    },
    "status": {
      "active": "Active",
      "past_due": "Payment Past Due",
      "cancelled": "Cancelled"
    }
  },
  "auditLog": {
    "title": "Audit Log",
    "filters": "Filters",
    "exportButton": "Export as CSV"
  }
}
```

---

## Business Logic Patterns

### Validation (`ux/logic/validate.ts`)

```typescript
// Type-safe validation for tenant operations
export const validateOrganization = (org: OrganizationContext) => {
  const errors: string[] = [];
  
  if (!org.name?.trim()) errors.push("Organization name required");
  if (org.name.length > 100) errors.push("Name must be ≤ 100 characters");
  
  const validPlans = ['starter', 'professional', 'enterprise'];
  if (!validPlans.includes(org.plan)) errors.push("Invalid plan selection");
  
  return { valid: errors.length === 0, errors };
};

export const validateMemberRole = (role: string, orgRoles: string[]) => {
  return orgRoles.includes(role);
};

export const validateInviteEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

### Transitions (`ux/logic/shared.ts`)

```typescript
// Shared subscription state transitions
export const handlePlanUpgrade = (ctx: SubscriptionContext, newPlan: string) => {
  const planHierarchy = {
    'starter': 1,
    'professional': 2,
    'enterprise': 3
  };
  
  return planHierarchy[newPlan] > planHierarchy[ctx.subscription.plan];
};

export const handlePastDueRetry = async (stripeService: any, subscriptionId: string) => {
  try {
    const result = await stripeService.retryPayment(subscriptionId);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const formatNextBillingDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
```

---

## Testing & Development

### FSM Registry (`src/fsm/registry.ts`)

Each view FSM is auto-registered:

```typescript
FSMRegistry.register('organization', organizationFSM);
FSMRegistry.register('membership', membershipFSM);
FSMRegistry.register('subscription', subscriptionFSM);
FSMRegistry.register('audit-log', auditLogFSM);
```

### Test Example

```typescript
import { FSMRegistry } from '@ux3/fsm';
import { it, expect, beforeEach } from 'vitest';

describe('Subscription FSM', () => {
  beforeEach(() => FSMRegistry.clear());

  it('should upgrade plan', () => {
    const fsm = FSMRegistry.get('subscription');
    fsm.send({ type: 'SELECT_PLAN', plan: 'professional' });
    expect(fsm.state.value).toBe('confirming_upgrade');
  });

  it('should handle past-due payment retry', async () => {
    const fsm = FSMRegistry.get('subscription');
    fsm.send({ type: 'RETRY_PAYMENT' });
    await new Promise(r => setTimeout(r, 100));
    expect(fsm.state.value).toBe('payment_processed');
  });
});
```

---

## Scaling Considerations

### Forward-Looking Features

#### 1. **Advanced RBAC**
   - Custom roles with granular permission trees
   - Temporary access elevation (just-in-time activation)
   - Time-bound role assignments

#### 2. **Audit & Compliance**
   - Real-time audit trail streaming via WebSocket
   - Retention policies per entity type
   - Compliance report generation (SOC2, GDPR, HIPAA templates)
   - Action replay for incident investigation

#### 3. **Billing Enhancements**
   - Multi-currency support
   - Proration logic for mid-cycle plan changes
   - Usage-based billing (metered pricing)
   - White-label billing portal
   - CCPA right-to-deletion in billing records

#### 4. **Team & Workspace Isolation**
   - Per-team API keys & scoped access
   - Team-level activity feeds
   - Cross-team collaboration workflows (with approval gates)
   - Team-specific integrations & webhooks

#### 5. **Integrations & Webhooks**
   - Outbound webhooks on subscription changes, member actions, audit events
   - Inbound integration marketplace (Slack, Discord, PagerDuty, etc.)
   - OAuth2 for third-party app access

#### 6. **Usage Analytics**
   - Per-org feature usage tracking
   - Churn prediction models
   - Plan consumption dashboards
   - API quota management FSM

#### 7. **Data Governance**
   - Data residency rules (EU/US/APAC)
   - Encryption at-rest per tenant
   - Tenant backup & restore workflows
   - Account migration (tenant portability)

---

## Getting Help

- **Configuration deep dives**: See [docs/compilation.md](../../docs/compilation.md)
- **FSM patterns**: See [docs/fsm-core.md](../../docs/fsm-core.md)
- **Form validation**: See [docs/forms.md](../../docs/forms.md)
- **Services**: See [docs/services.md](../../docs/services.md)
