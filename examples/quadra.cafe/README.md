# Quadra.café — Restaurant Operations Platform

A full-stack UX3 application for modern restaurant operations: from customer-facing ordering through kitchen operations, inventory management, staff scheduling, and business analytics. This example demonstrates how **FSM-driven architecture** orchestrates complex, real-time workflows in hospitality.

## Quick Start

```bash
cd examples/quadra.cafe
ux3 dev
```

Open [localhost:5173](http://localhost:5173). The inspector panel shows live order states, kitchen tickets, reservation FSMs, and payment processing flows.

---

## Architecture Overview

**Quadra.café** models every operational entity as a declarative state machine: orders flow through preparation states, reservations through confirmation workflows, inventory through stock-level events, and staff through shift management. All business logic is configuration-driven; the runtime is purely event-driven.

### Core Entity FSMs

| Entity | Purpose | FSM States | Key Transitions |
|--------|---------|-----------|-----------------|
| **Order** | Customer request lifecycle | `created` → `confirmed` → `preparing` → `ready` → `served` → `paid` | Cancel, modify items, pause prep, rush prep, split payment |
| **Menu** | Dishes, pricing, availability | `draft` → `published` → `seasonal` → `archived` | Adjust price, mark sold-out, enable allergen warnings |
| **Reservation** | Table bookings + party management | `pending` → `confirmed` → `seated` → `completed` → `cancelled` | Modify party size/time, waitlist promotion, auto-release if no-show |
| **Payment** | Order settlement + splitting | `pending` → `processing` → `completed` → `refunded` | Split between multiple payers, tip adjustments, refund handling |
| **Kitchen Ticket** | Preparation instructions | `received` → `in_progress` → `expediting` → `ready` → `collected` | Fast-track priority items, recall for modification, reassign station |
| **Inventory** | Stock tracking per ingredient | `in_stock` → `low_stock` → `out_of_stock` → `reorder_pending` | Auto-reorder thresholds, damage/waste logging, cycle counts |
| **Staff Shift** | Employee scheduling + clocking | `draft` → `published` → `started` → `break` → `completed` | Early out, shift swap requests, disciplinary flags |
| **Table** | Seating + dining session | `available` → `reserved` → `dining` → `settling` → `ready` | Auto-seat from waitlist, extend seating time, merge tables |

---

## Declarative Configuration

### Project Configuration (`ux/ux3.yaml`)

```yaml
name: quadra.cafe
index: view/index.yaml
domain: 'quadra.cafe'

site:
  title: "Quadra Restaurant Operations"
  description: "Full-stack restaurant management and customer ordering"

plugins:
  - name: '@ux3/plugin-tailwind-plus'
    config:
      css: 'https://cdn.tailwindcss.com'
  - name: '@ux3/plugin-stripe'
    config:
      apiKey: '{{ env.STRIPE_PUBLISHABLE_KEY }}'
  - name: '@ux3/plugin-charts-js'  # For kitchen metrics / analytics
  - name: '@ux3/plugin-sentry'
    config:
      dsn: '{{ env.SENTRY_DSN }}'

secrets:
  RESTAURANT_API_KEY: "{{ env.RESTAURANT_API_KEY }}"
  SQUARE_API_KEY: "{{ env.SQUARE_API_KEY }}"
  JWT_SECRET: "{{ env.JWT_SECRET }}"

runtime:
  bundleKey: "quadra.cafe"
  hydrationFn: "initRestaurant"

development:
  hot-reload: true
  logging: "debug"
  inspector: true
```

### Service Configuration (`ux/service/services.yaml`)

```yaml
services:
  # Core operations API (orders, reservations, menu)
  ops-api:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1'
    auth:
      type: bearer
      token: '{{ secrets.RESTAURANT_API_KEY }}'
    headers:
      X-Location-ID: '{{ ctx.locationId }}'

  # Real-time kitchen display system (KDS)
  kitchen-stream:
    adapter: websocket
    url: 'ws://localhost:3001/api/v1/kitchen/stream'
    auth:
      type: bearer
      token: '{{ secrets.RESTAURANT_API_KEY }}'
    reconnectAttempts: 10
    reconnectInterval: 1000

  # Payment processing (Stripe/Square)
  payments:
    adapter: jsonrpc
    endpoint: 'http://localhost:3001/api/v1/payments'
    auth:
      type: bearer
      token: '{{ secrets.RESTAURANT_API_KEY }}'

  # Real-time table status tracking
  tables:
    adapter: websocket
    url: 'ws://localhost:3001/api/v1/tables/status'
    reconnectAttempts: 5

  # Inventory management
  inventory:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1/inventory'
    auth:
      type: bearer
      token: '{{ secrets.RESTAURANT_API_KEY }}'
    caching:
      enabled: true
      ttl: 60  # Cache for 1 minute due to frequent updates

  # Staff & shift management
  staff:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1/staff'
    auth:
      type: bearer
      token: '{{ secrets.RESTAURANT_API_KEY }}'

  # Analytics & reporting
  analytics:
    adapter: http
    baseUrl: 'http://localhost:3001/api/v1/analytics'
    caching:
      enabled: true
      ttl: 300
```

---

## View State Machines

### Order Management (`ux/view/order.yaml`)

```yaml
name: Order
layout: default
initial: loading

context:
  order:
    id: null
    orderNumber: null
    customerId: null
    items: []
    subtotal: 0
    tax: 0
    total: 0
    status: "created"
    createdAt: null
    notes: ""
  selectedItems: []
  diningMode: "dine-in"  # dine-in, takeout, delivery
  tableNumber: null
  error: null
  estimatedReadyTime: null

states:
  loading:
    template: 'view/order/loading.html'
    invoke:
      service: ops-api
      method: getOrder
      input: '{{ { orderId: ctx.order.id } }}'
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.order = event.order;
            ctx.estimatedReadyTime = event.estimatedReadyTime;
          }
      ERROR:
        target: error

  viewing:
    template: 'view/order/viewing.html'
    on:
      ADD_ITEM: browsing_menu
      MODIFY_ITEM:
        target: editing_item
        action: (ctx, event) => { ctx.selectedItems = [event.item]; }
      REMOVE_ITEM:
        target: updating
      SEND_TO_KITCHEN:
        target: confirming_send
        guard: (ctx) => ctx.order.items.length > 0
      CANCEL_ORDER:
        target: confirming_cancellation
        guard: (ctx) => ['created', 'confirmed'].includes(ctx.order.status)
      MODIFY_NOTES:
        target: editing_notes
      REQUEST_PAYMENT: checkout

  browsing_menu:
    template: 'view/order/browsing_menu.html'
    on:
      SELECT_ITEM:
        target: customizing_item
        action: (ctx, event) => { ctx.selectedItems = [event.item]; }
      CANCEL: viewing

  customizing_item:
    template: 'view/order/customizing_item.html'
    on:
      ADD_TO_ORDER:
        target: viewing
        action: |
          (ctx, event) => {
            const item = { ...ctx.selectedItems[0], ...event.customizations, quantity: event.quantity };
            ctx.order.items.push(item);
            ctx.order.subtotal = ctx.order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            ctx.order.tax = ctx.order.subtotal * 0.08;  // adjust for location
            ctx.order.total = ctx.order.subtotal + ctx.order.tax;
          }
      CANCEL: browsing_menu

  editing_item:
    template: 'view/order/editing_item.html'
    on:
      UPDATE_ITEM:
        target: viewing
        action: |
          (ctx, event) => {
            const idx = ctx.order.items.findIndex(i => i.id === ctx.selectedItems[0].id);
            if (idx >= 0) {
              ctx.order.items[idx] = { ...ctx.order.items[idx], ...event.customizations };
              ctx.order.tax = ctx.order.subtotal * 0.08;
              ctx.order.total = ctx.order.subtotal + ctx.order.tax;
            }
          }
      CANCEL: viewing

  updating:
    invoke:
      service: ops-api
      method: updateOrder
      input: '{{ ctx.order }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.order = event.order; }
      ERROR:
        target: viewing

  editing_notes:
    template: 'view/order/editing_notes.html'
    on:
      SAVE_NOTES:
        target: updating
        action: (ctx, event) => { ctx.order.notes = event.notes; }
      CANCEL: viewing

  confirming_send:
    template: 'view/order/confirming_send.html'
    on:
      CONFIRM:
        target: sending_to_kitchen
      CANCEL: viewing

  sending_to_kitchen:
    invoke:
      service: kitchen-stream
      method: submitTicket
      input: '{{ { order: ctx.order, notes: ctx.order.notes } }}'
    on:
      SUCCESS:
        target: kitchen_tracking
        action: |
          (ctx, event) => {
            ctx.order.status = 'confirmed';
            ctx.estimatedReadyTime = event.estimatedReadyTime;
          }
      ERROR:
        target: viewing

  kitchen_tracking:
    template: 'view/order/kitchen_tracking.html'
    on:
      ITEM_READY: kitchen_tracking  # FSM remains in same state, receives updates via WebSocket
      ITEM_IN_PROGRESS: kitchen_tracking
      ALL_READY:
        target: ready_for_pickup
      CANCEL_ORDER:
        target: confirming_cancellation
      FORCE_COMPLETE: ready_for_pickup

  ready_for_pickup:
    template: 'view/order/ready_for_pickup.html'
    on:
      CUSTOMER_ARRIVED: marking_complete
      MARK_COMPLETE: marking_complete
      EDIT_ORDER: viewing

  marking_complete:
    invoke:
      service: ops-api
      method: completeOrder
      input: '{{ ctx.order.id }}'
    on:
      SUCCESS:
        target: complete
        action: (ctx, event) => { ctx.order.status = 'served'; }
      ERROR:
        target: ready_for_pickup

  complete:
    template: 'view/order/complete.html'
    on:
      REQUEST_PAYMENT: checkout
      NEW_ORDER:
        target: loading
        action: (ctx) => { ctx.order = { id: null, items: [] }; }

  checkout:
    template: 'view/order/checkout.html'
    on:
      PROCESS_PAYMENT:
        target: processing_payment
      CANCEL: complete

  processing_payment:
    invoke:
      service: payments
      method: processPayment
      input: '{{ { orderId: ctx.order.id, amount: ctx.order.total } }}'
    on:
      SUCCESS:
        target: payment_complete
        action: (ctx, event) => { ctx.order.status = 'paid'; }
      ERROR:
        target: checkout
        action: (ctx, event) => { ctx.error = event.message; }

  payment_complete:
    template: 'view/order/payment_complete.html'
    on:
      DONE:
        target: loading
        action: (ctx) => { ctx.order = { id: null, items: [] }; }

  confirming_cancellation:
    template: 'view/order/confirming_cancellation.html'
    on:
      CONFIRM:
        target: cancelling
      CANCEL: viewing

  cancelling:
    invoke:
      service: ops-api
      method: cancelOrder
      input: '{{ ctx.order.id }}'
    on:
      SUCCESS:
        target: cancelled
        action: (ctx, event) => { ctx.order.status = 'cancelled'; }
      ERROR:
        target: viewing

  cancelled:
    template: 'view/order/cancelled.html'
    on:
      NEW_ORDER:
        target: loading
        action: (ctx) => { ctx.order = { id: null, items: [] }; }

  error:
    template: 'view/order/error.html'
    on:
      RETRY: loading
      DISMISS: viewing
```

### Reservation System (`ux/view/reservation.yaml`)

```yaml
name: Reservation
layout: default
initial: loading

context:
  reservation:
    id: null
    partyName: ""
    partySize: 2
    dateTime: null
    status: "pending"  # pending, confirmed, seated, completed, cancelled
    notes: ""
    phoneNumber: ""
    guests: []
  availableTables: []
  selectedTable: null
  waitlistPosition: null
  error: null

states:
  loading:
    template: 'view/reservation/loading.html'
    invoke:
      service: ops-api
      method: getAvailableSlots
      input: '{{ { partySize: ctx.reservation.partySize, dateTime: ctx.reservation.dateTime } }}'
    on:
      SUCCESS:
        target: viewing_slots
        action: (ctx, event) => { ctx.availableTables = event.tables; }
      ERROR:
        target: waitlist_only
        action: (ctx, event) => { ctx.waitlistPosition = event.position; }

  viewing_slots:
    template: 'view/reservation/viewing_slots.html'
    on:
      SELECT_TABLE:
        target: confirming_reservation
        action: (ctx, event) => { ctx.selectedTable = event.table; }
      MODIFY_PARTY_SIZE:
        target: loading
        action: (ctx, event) => { ctx.reservation.partySize = event.size; }
      REQUEST_WAITLIST:
        target: waitlist_joining

  waitlist_only:
    template: 'view/reservation/waitlist_only.html'
    on:
      JOIN_WAITLIST:
        target: waitlist_joining
      MODIFY_PARTY_SIZE:
        target: loading

  waitlist_joining:
    invoke:
      service: ops-api
      method: joinWaitlist
      input: '{{ { partySize: ctx.reservation.partySize, dateTime: ctx.reservation.dateTime } }}'
    on:
      SUCCESS:
        target: waiting_for_table
        action: |
          (ctx, event) => {
            ctx.waitlistPosition = event.position;
            ctx.reservation.status = 'waitlisted';
          }
      ERROR:
        target: viewing_slots

  waiting_for_table:
    template: 'view/reservation/waiting_for_table.html'
    on:
      TABLE_AVAILABLE:
        target: confirming_table_available
        action: (ctx, event) => { ctx.selectedTable = event.table; }
      CANCEL_WAITLIST:
        target: cancelled
      MODIFY_PARTY_SIZE:
        target: modifying_party_size

  modifying_party_size:
    invoke:
      service: ops-api
      method: updateWaitlistPartySize
      input: '{{ { newSize: /* event.size */ } }}'
    on:
      SUCCESS:
        target: waiting_for_table
        action: (ctx, event) => { ctx.waitlistPosition = event.newPosition; }
      ERROR:
        target: waiting_for_table

  confirming_reservation:
    template: 'view/reservation/confirming_reservation.html'
    on:
      CONFIRM:
        target: submitting_reservation
      CANCEL: viewing_slots

  confirming_table_available:
    template: 'view/reservation/confirming_table_available.html'
    on:
      CONFIRM:
        target: submitting_reservation
      DECLINE:
        target: waiting_for_table

  submitting_reservation:
    invoke:
      service: ops-api
      method: createReservation
      input: '{{ { partySize: ctx.reservation.partySize, tableId: ctx.selectedTable.id, dateTime: ctx.reservation.dateTime, notes: ctx.reservation.notes } }}'
    on:
      SUCCESS:
        target: confirmed
        action: |
          (ctx, event) => {
            ctx.reservation = event.reservation;
            ctx.reservation.status = 'confirmed';
          }
      ERROR:
        target: viewing_slots

  confirmed:
    template: 'view/reservation/confirmed.html'
    on:
      MODIFY:
        target: modifying_reservation
      CANCEL:
        target: confirming_cancellation
      MARK_SEATED:
        target: seated

  modifying_reservation:
    template: 'view/reservation/modifying_reservation.html'
    on:
      SAVE_CHANGES:
        target: updating_reservation
      CANCEL: confirmed

  updating_reservation:
    invoke:
      service: ops-api
      method: updateReservation
      input: '{{ ctx.reservation }}'
    on:
      SUCCESS:
        target: confirmed
      ERROR:
        target: modifying_reservation

  confirming_cancellation:
    template: 'view/reservation/confirming_cancellation.html'
    on:
      CONFIRM:
        target: cancelling
      CANCEL: confirmed

  cancelling:
    invoke:
      service: ops-api
      method: cancelReservation
      input: '{{ ctx.reservation.id }}'
    on:
      SUCCESS:
        target: cancelled
      ERROR:
        target: confirmed

  seated:
    template: 'view/reservation/seated.html'
    on:
      START_ORDER: checkout_modal
      EXTEND_SEATING:
        target: extending_time
      COMPLETE:
        target: completed

  completing:
    invoke:
      service: ops-api
      method: completeReservation
      input: '{{ ctx.reservation.id }}'
    on:
      SUCCESS:
        target: completed

  completed:
    template: 'view/reservation/completed.html'
    on:
      REQUEST_FEEDBACK: feedback
      NEW_RESERVATION:
        target: loading
        action: (ctx) => { ctx.reservation = { id: null, partySize: 2 }; }

  feedback:
    template: 'view/reservation/feedback.html'
    on:
      SUBMIT_FEEDBACK:
        target: completed
      SKIP: completed

  cancelled:
    template: 'view/reservation/cancelled.html'
    on:
      NEW_RESERVATION:
        target: loading

  extending_time:
    invoke:
      service: ops-api
      method: extendSeatingTime
      input: '{{ { reservationId: ctx.reservation.id, minutes: 30 } }}'
    on:
      SUCCESS:
        target: seated
      ERROR:
        target: seated

  error:
    on:
      RETRY: loading
```

### Menu Management (`ux/view/menu.yaml`)

```yaml
name: Menu
layout: admin
initial: loading

context:
  categories: []
  items: []
  selectedCategory: null
  newItem:
    name: ""
    description: ""
    price: 0
    category: ""
    isAvailable: true
    allergens: []
    preparationTime: 0
  editingItem: null
  error: null

states:
  loading:
    invoke:
      service: ops-api
      method: getMenu
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.categories = event.categories;
            ctx.items = event.items;
          }
      ERROR:
        target: error

  viewing:
    template: 'view/menu/viewing.html'
    on:
      CREATE_ITEM: creating_item
      EDIT_ITEM:
        target: editing
        action: (ctx, event) => { ctx.editingItem = event.item; }
      TOGGLE_AVAILABILITY:
        target: updating_availability
        action: (ctx, event) => { ctx.editingItem = event.item; }
      REFRESH: loading

  creating_item:
    template: 'view/menu/creating_item.html'
    on:
      SAVE_ITEM:
        target: submitting_item
      CANCEL: viewing

  editing:
    template: 'view/menu/editing.html'
    on:
      SAVE_ITEM:
        target: submitting_item
      CANCEL: viewing

  submitting_item:
    invoke:
      service: ops-api
      method: '{{ ctx.editingItem?.id ? "updateItem" : "createItem" }}'
      input: '{{ ctx.editingItem || ctx.newItem }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.items = event.items; }
      ERROR:
        target: '{{ ctx.editingItem?.id ? "editing" : "creating_item" }}'

  updating_availability:
    invoke:
      service: ops-api
      method: updateItemAvailability
      input: '{{ { itemId: ctx.editingItem.id, isAvailable: !ctx.editingItem.isAvailable } }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.editingItem.isAvailable = !ctx.editingItem.isAvailable; }
      ERROR:
        target: viewing

  error:
    on:
      RETRY: loading
```

### Kitchen Display System (`ux/view/kitchen.yaml`)

```yaml
name: Kitchen
layout: kitchen
initial: connecting

context:
  tickets: []  # Active kitchen tickets
  completedTickets: []
  selectedTicket: null
  stationsFilter: "all"  # all, grill, fryer, sauce, plating
  orderingMode: "fifo"  # fifo, priority, by_station
  error: null

states:
  connecting:
    invoke:
      service: kitchen-stream
      method: connect
    on:
      SUCCESS: monitoring
      ERROR: error

  monitoring:
    template: 'view/kitchen/monitoring.html'
    on:
      TICKET_RECEIVED:
        target: monitoring
        action: (ctx, event) => { ctx.tickets.push(event.ticket); }
      START_PREP:
        target: updating_ticket
        action: |
          (ctx, event) => {
            const idx = ctx.tickets.findIndex(t => t.id === event.ticketId);
            if (idx >= 0) ctx.tickets[idx].status = 'in_progress';
          }
      MARK_READY:
        target: updating_ticket
        action: |
          (ctx, event) => {
            const idx = ctx.tickets.findIndex(t => t.id === event.ticketId);
            if (idx >= 0) ctx.tickets[idx].status = 'ready';
          }
      EXPEDITE:
        target: expediting
        action: (ctx, event) => { ctx.selectedTicket = event.ticket; }
      REASSIGN_STATION:
        target: reassigning
      FILTER_STATION:
        target: monitoring
        action: (ctx, event) => { ctx.stationsFilter = event.station; }

  updating_ticket:
    invoke:
      service: kitchen-stream
      method: updateTicket
      input: '{{ ctx.selectedTicket }}'
    on:
      SUCCESS: monitoring
      ERROR: monitoring

  expediting:
    template: 'view/kitchen/expediting.html'
    on:
      CONFIRM:
        target: updating_ticket
        action: (ctx) => { ctx.selectedTicket.priority = 'high'; }
      CANCEL: monitoring

  reassigning:
    template: 'view/kitchen/reassigning.html'
    on:
      CONFIRM_REASSIGN:
        target: updating_ticket
      CANCEL: monitoring

  error:
    on:
      RETRY: connecting
```

### Inventory Management (`ux/view/inventory.yaml`)

```yaml
name: Inventory
layout: admin
initial: loading

context:
  ingredients: []
  lowStockItems: []
  reorderAlerts: []
  selectedIngredient: null
  error: null

states:
  loading:
    invoke:
      service: inventory
      method: getAllIngredients
    on:
      SUCCESS:
        target: viewing
        action: |
          (ctx, event) => {
            ctx.ingredients = event.ingredients;
            ctx.lowStockItems = event.ingredients.filter(i => i.quantity <= i.reorderLevel);
            ctx.reorderAlerts = event.reorders;
          }
      ERROR:
        target: error

  viewing:
    template: 'view/inventory/viewing.html'
    on:
      LOG_USAGE:
        target: logging_usage
      LOG_WASTE:
        target: logging_waste
      ADJUST_STOCK:
        target: adjusting
      PLACE_REORDER:
        target: placing_reorder
      VIEW_HISTORY:
        target: viewing_history
      REFRESH: loading

  logging_usage:
    template: 'view/inventory/logging_usage.html'
    on:
      CONFIRM:
        target: submitting_usage
      CANCEL: viewing

  submitting_usage:
    invoke:
      service: inventory
      method: logUsage
      input: '{{ { ingredientId: ctx.selectedIngredient.id, quantity: /* from form */ } }}'
    on:
      SUCCESS:
        target: viewing
      ERROR:
        target: logging_usage

  logging_waste:
    template: 'view/inventory/logging_waste.html'
    on:
      CONFIRM:
        target: submitting_waste
      CANCEL: viewing

  submitting_waste:
    invoke:
      service: inventory
      method: logWaste
      input: '{{ { ingredientId: ctx.selectedIngredient.id, quantity: /* from form */ } }}'
    on:
      SUCCESS:
        target: viewing
      ERROR:
        target: logging_waste

  adjusting:
    template: 'view/inventory/adjusting.html'
    on:
      CONFIRM:
        target: submitting_adjustment
      CANCEL: viewing

  submitting_adjustment:
    invoke:
      service: inventory
      method: adjustStock
      input: '{{ ctx.selectedIngredient }}'
    on:
      SUCCESS:
        target: viewing
      ERROR:
        target: adjusting

  placing_reorder:
    template: 'view/inventory/placing_reorder.html'
    on:
      CONFIRM:
        target: submitting_reorder
      CANCEL: viewing

  submitting_reorder:
    invoke:
      service: inventory
      method: createReorder
      input: '{{ { ingredientId: ctx.selectedIngredient.id, quantity: /* from form */ } }}'
    on:
      SUCCESS:
        target: viewing
        action: (ctx, event) => { ctx.reorderAlerts = event.reorders; }
      ERROR:
        target: placing_reorder

  viewing_history:
    template: 'view/inventory/viewing_history.html'
    on:
      BACK: viewing

  error:
    on:
      RETRY: loading
```

---

## i18n Strings (`ux/i18n/`)

```json
{
  "order": {
    "title": "Place Order",
    "statuses": {
      "created": "Creating order...",
      "confirmed": "Order sent to kitchen",
      "preparing": "Being prepared",
      "ready": "Ready for pickup!",
      "served": "Completed",
      "paid": "Paid"
    }
  },
  "reservation": {
    "title": "Reserve a Table",
    "selectDateTime": "Select date & time",
    "selectPartySize": "Party size",
    "confirmationSent": "Confirmation sent to {{ phoneNumber }}"
  },
  "kitchen": {
    "title": "Kitchen Display System",
    "newTicket": "New ticket received",
    "itemReady": "Item ready for plating",
    "orderComplete": "Order complete"
  },
  "menu": {
    "title": "Menu Management",
    "addItem": "Add new dish",
    "editItem": "Edit dish"
  },
  "inventory": {
    "title": "Inventory",
    "lowStock": "Low stock alert",
    "reorderNeeded": "Reorder needed"
  }
}
```

---

## Business Logic Patterns

### Order Calculations (`ux/logic/orders.ts`)

```typescript
export const calculateOrderTotals = (items: OrderItem[], taxRate: number = 0.08) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  
  return { subtotal, tax, total };
};

export const estimatePreparationTime = (items: OrderItem[]) => {
  // Longest item determines order ready time (parallel cooking)
  const maxTime = Math.max(...items.map(i => i.preparationTime || 15));
  
  // Add 2 minutes for plating/expediting
  return maxTime + 2;
};

export const handleCancellation = (order: Order) => {
  const cancellableStates = ['created', 'confirmed'];
  if (!cancellableStates.includes(order.status)) {
    throw new Error(`Cannot cancel order in ${order.status} state`);
  }
  
  // Refund if already paid
  if (order.paymentStatus === 'completed') {
    return { refund: order.total };
  }
  
  return { refund: 0 };
};
```

### Reservation Logic (`ux/logic/reservations.ts`)

```typescript
export const checkTableAvailability = (
  tables: Table[],
  partySize: number,
  dateTime: Date
): Table[] => {
  return tables.filter(t => {
    // Table capacity must accommodate party
    if (t.capacity < partySize) return false;
    
    // Table must be available at requested time
    if (t.reservedAt && isTimeConflict(t.reservedAt, t.seatingDuration, dateTime)) {
      return false;
    }
    
    return true;
  });
};

export const calculateWaitlistPosition = (partySize: number, dateTime: Date) => {
  // Simple FIFO; production would query database
  return { position: 5, estimatedWaitTime: 45 };
};

export const autoSeatFromWaitlist = (table: Table, waitlist: WaitlistEntry[]) => {
  // Find first available party that fits table capacity
  return waitlist.find(entry => entry.partySize <= table.capacity) || null;
};

export const calculateSeatingDuration = (partySize: number) => {
  // Average 60 minutes per party, plus variance for larger groups
  return 60 + (partySize > 4 ? (partySize - 4) * 10 : 0);
};
```

### Inventory Logic (`ux/logic/inventory.ts`)

```typescript
export const checkReorderThreshold = (current: number, reorderLevel: number) => {
  return current <= reorderLevel;
};

export const calculateReorderQuantity = (ingredient: Ingredient) => {
  // Order enough to last 2 weeks at average usage rate
  const dailyUsage = ingredient.averageDailyUsage || 10;
  return dailyUsage * 14;
};

export const logWaste = (
  ingredient: Ingredient,
  quantity: number,
  reason: string
) => {
  // Track waste for cost analysis & sustainability
  return {
    amount: quantity,
    reason,
    cost: quantity * ingredient.costPerUnit,
    timestamp: new Date()
  };
};

export const predictStockout = (ingredient: Ingredient): Date | null => {
  const dailyUsage = ingredient.averageDailyUsage || 10;
  const daysUntilOut = Math.floor(ingredient.quantity / dailyUsage);
  
  if (daysUntilOut <= 0) return new Date();
  
  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + daysUntilOut);
  return predictedDate;
};
```

---

## Advanced Features (Forward-Looking)

### 1. **Real-Time Kitchen Display System (KDS)**
   - Live ticket streaming via WebSocket
   - Color-coded priority flags (rush, VIP, combo items)
   - Auto-print integration with thermal printers
   - Kitchen metrics: avg prep time, throughput by station

### 2. **Predictive Analytics**
   - Demand forecasting (rush hours, seasonal )
   - Ingredient consumption predictions
   - Staff scheduling optimization
   - Churn prediction for reservations

### 3. **Staff Coordination**
   - Shift swapping with approval workflows
   - Table assignment & load balancing
   - Break management FSM
   - Disciplinary action tracking

### 4. **Multi-Location Support**
   - Central analytics across venues
   - Inventory pooling / transfers between locations
   - Menu variations per location
   - Cross-location staff scheduling

### 5. **Customer Loyalty & Engagement**
   - Reservation history & preferences
   - Loyalty points on orders/reservations
   - Personalized menu recommendations
   - Email/SMS notifications (reservation reminders, order ready, special offers)

### 6. **Delivery & Curbside Pickup**
   - Delivery route optimization
   - Driver assignment & tracking
   - Curbside pickup check-in FSM
   - Proof-of-delivery receipts

### 7. **Compliance & Health Safety**
   - Temperature monitoring for food storage
   - Allergen warnings & cross-contamination prevention FSM
   - Food safety certifications tracking
   - Health inspection audit trails

### 8. **Integration Marketplace**
   - Third-party ordering platforms (Uber Eats, DoorDash)
   - Online reservation syncing (Resy, OpenTable)
   - POS system integration
   - Accounting software (NetSuite, QuickBooks)

---

## Getting Help

- **Configuration walkthrough**: See [docs/compilation.md](../../docs/compilation.md)
- **FSM patterns**: See [docs/fsm-core.md](../../docs/fsm-core.md)
- **Real-time updates**: See [docs/reactive-state.md](../../docs/reactive-state.md)
- **Services & APIs**: See [docs/services.md](../../docs/services.md)
- **Form patterns**: See [docs/forms.md](../../docs/forms.md)
