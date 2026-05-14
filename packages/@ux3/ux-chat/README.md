# @ux3/ux-chat

Chat UI widgets for UX3.

## Features

- Custom chat UI elements for messages, composer, and messenger layout
- Declarative chat rendering for UX3 views
- Reusable chat primitives for conversation-driven apps

## Installation

```bash
npm install @ux3/ux-chat
```

## Basic Usage

```ts
import ChatPlugin from '@ux3/ux-chat';

const app = initializeApp({
  plugins: [ChatPlugin],
});
```

## Plugin Usage

- Add `<ux-chat-messages>`, `<ux-chat-composer>`, and `<ux-chat-messenger>` to your view templates.
- Use the exported components directly in custom elements or JSX, if supported.

## API

- `UxChatMessages`, `UxChatComposer`, `UxChatMessenger` — exported chat widget classes.

## Example

```html
<ux-chat-messenger>
  <ux-chat-messages></ux-chat-messages>
  <ux-chat-composer></ux-chat-composer>
</ux-chat-messenger>
```

## Notes

- This plugin is focused on chat UI composition and does not include backend messaging logic.
