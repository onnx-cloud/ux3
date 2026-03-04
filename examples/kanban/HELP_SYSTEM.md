# Help System for Kanban

This Kanban example includes an integrated, user-facing help system with context-sensitive help pages for every view.

## Overview

The help system provides:
- **Per-view help pages** in markdown format
- **In-UI help buttons** in each view header
- **Popover help panels** showing markdown content
- **Keyboard shortcuts** for quick access
- **Responsive design** for mobile and desktop
- **Dark mode support** for accessibility
- **Analytics integration** (optional)

## Features

### 🎯 User-Facing Help
- **Easy to access**: Blue "?" button in every view header
- **Context-specific**: Each view has dedicated help content
- **No page navigation**: Help appears in a popover, stays in context
- **Quick close**: Escape key, X button, or click outside to close

### 📚 Rich Content
- **Markdown formatted**: Professional, well-structured documentation
- **Text formatting**: Bold, italic, code, tables, lists
- **Emoji support**: Use emojis for visual callouts (💡, ✅, ⚠️, etc.)
- **Links**: Both internal and external links work
- **Code examples**: Display code with syntax styling

### ♿ Accessible
- **ARIA labels**: Proper semantic markup
- **Keyboard navigation**: Tab keys work, Escape closes
- **Focus management**: Focus moves to help content when opened
- **Color contrast**: High contrast text on colored backgrounds
- **Reduced motion**: Respects prefers-reduced-motion setting

### 🎨 Themeable
- **Light/Dark mode**: Automatically follows system preference
- **Brand colors**: Uses CSS variables for primary colors
- **Mobile responsive**: Popover adapts to small screens
- **Touch-friendly**: Large touch targets and buttons

## Architecture

### Files Structure

```
examples/kanban/
├── ux/
│   ├── help/                    # Help content (markdown)
│   │   ├── home.md              # Home view help
│   │   ├── board-list.md        # Board list view help
│   │   ├── board.md             # Kanban board help
│   │   ├── task-detail.md       # Task detail help
│   │   ├── lane-manager.md      # Lane manager help
│   │   └── project-settings.md  # Settings help
│   │
│   ├── view/
│   │   ├── home/idle.html       # Has help button
│   │   ├── board-list/idle.html # Has help button
│   │   ├── board/idle.html      # Has help button
│   │   ├── task-detail/viewing.html
│   │   ├── lane-manager/idle.html
│   │   └── project-settings/idle.html
│   │
│   ├── style/
│   │   └── help.css             # Help styles
│   │
│   └── component/
│       └── help-button.html     # Reusable help component
│
├── src/
│   └── help.js                  # Help initialization script
│
└── ... (rest of app)
```

### How It Works

1. **Template includes help button**
   ```html
   <div class="help-wrapper">
     <button class="help-button" type="button">?</button>
     <div class="help-popover">
       <div class="help-popover-header">
         <h3>Help Title</h3>
         <button class="help-close-btn">×</button>
       </div>
       <div class="help-popover-content">
         <ux-markdown ux-src="ux/help/page.md" />
       </div>
     </div>
     <div class="help-overlay"></div>
   </div>
   ```

2. **Markdown file contains help content**
   ```markdown
   # Help Title
   
   ## What You Can Do
   - Item 1
   - Item 2
   
   ## Tips
   💡 Helpful tip here
   ```

3. **Help system initializes**
   - `help.js` attaches event listeners
   - Click button → popover appears
   - Click X or Escape → popover closes
   - `ux-markdown` component converts markdown to HTML

4. **Styles applied**
   - `help.css` styles the popover and content
   - Responsive breakpoints for mobile
   - Dark mode styles for accessibility

## Adding New Help Pages

### Step 1: Create Markdown File

Create a new file in `ux/help/` with descriptive content:

```bash
touch examples/kanban/ux/help/my-feature.md
```

### Step 2: Write Help Content

Use markdown with clear sections:

```markdown
# My Feature - Quick Guide

Welcome! This page explains how to use my feature.

## What You Can Do

### Create Items
Click the "Create" button to add a new item.

### Edit Items
1. Click an item to select it
2. Make changes
3. Click Save

## Tips & Tricks

💡 **Pro Tip**: Use keyboard shortcut Ctrl+N to create quickly

⚠️ **Warning**: Deleting is permanent, use with care

## Common Tasks

### Task 1: Do something
1. Step 1
2. Step 2
3. Done!

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new |
| `Delete` | Remove item |
| `?` | Show help |
```

### Step 3: Update Template

Add help button to your view template:

```html
<header>
  <h1>My Feature</h1>
  <div style="display: flex; gap: 8px;">
    <!-- other buttons -->
    <div class="help-wrapper">
      <button class="help-button" type="button" title="Get help">?</button>
      <div class="help-popover" role="dialog" aria-label="Help content">
        <div class="help-popover-header">
          <h3>My Feature Help</h3>
          <button class="help-close-btn" type="button">×</button>
        </div>
        <div class="help-popover-content">
          <ux-markdown ux-src="ux/help/my-feature.md" />
        </div>
      </div>
      <div class="help-overlay"></div>
    </div>
  </div>
</header>
```

That's it! The help system automatically handles the rest.

## Customization

### Change Button Color

Edit `help.css` or override in your app:

```css
.help-button {
  background: var(--color-primary, #your-color);
}
```

### Change Popover Width

```css
.help-popover {
  width: 500px; /* default 400px */
}
```

### Change Animation

```css
.help-popover {
  animation: customSlide 0.3s ease;
}

@keyframes customSlide {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```

### Disable Analytics Tracking

Comment out in `help.js`:

```javascript
// Optional: Track help usage
// trackHelpUsage();
```

## Content Guidelines

### Writing Good Help

✅ **DO:**
- Write for end users (not developers)
- Use simple, clear language
- Include examples and screenshots concepts
- Organize with headers and sections
- Use numbered steps for procedures
- Add tips and warnings with emojis

❌ **DON'T:**
- Use technical jargon
- Write too long sections
- Mix multiple topics in one help page
- Forget to explain why, not just how
- Write in past tense

### Help Page Template

```markdown
# Feature Name - What It Does

One sentence summary of what this feature is about.

## What You Can Do

List the main actions users can perform.

### Action 1
Brief explanation.

### Action 2
Brief explanation.

## How To Get Started

Step-by-step guide for new users.

## Tips & Tricks

💡 Helpful hints for power users

## Common Tasks

### Task 1
Steps to accomplish task 1.

### Task 2
Steps to accomplish task 2.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|

## Troubleshooting

### Problem 1
Solution.

### Problem 2
Solution.

---

**Need more?** See the FAQ or contact support.
```

## Features in Detail

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Open help for current view |
| `Escape` | Close help popover |
| `Tab` | Navigate within help |

### Mobile Behavior

- Help button remains visible
- Popover is full-width on small screens
- Touch-friendly button size (32×32px minimum)
- Scrollable content for long help pages

### Dark Mode

Help automatically adapts to system dark mode preference:
- Light text on dark background
- Adjusted colors for links and code
- Maintains good contrast ratio

### Analytics (Optional)

Track which help pages users open:

```javascript
window.HelpSystem.init();
// Help opens are logged as Google Analytics events:
// Event: "help_opened"
// Parameter: help_topic (the help title)
```

Enable in `help.js`:

```javascript
// Optional: Track help usage
trackHelpUsage();  // Uncomment this line
```

## Browser Support

The help system works in all modern browsers:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Performance

- **Lightweight**: CSS + minimal JavaScript
- **No external dependencies**: Uses vanilla JS
- **Fast render**: Markdown converted at build time
- **Accessible**: Proper ARIA labels
- **SEO friendly**: Help content is crawlable

## Maintenance

Help pages automatically update when:
- You edit markdown files in `ux/help/`
- Build system recompiles
- Next page load shows updated content

No need to restart dev server or clear cache.

## Future Enhancements

Possible improvements:
- **Video tutorials** for complex features
- **Interactive walkthroughs** using the help
- **AI-powered search** within help
- **Translation** into multiple languages
- **In-context tooltips** for specific buttons
- **Help analytics dashboard** for product team
- **User ratings** on help page usefulness
- **Inline code examples** with live editing

## Troubleshooting

### Help button not appearing
1. Check `help.css` is loaded
2. Verify `help-wrapper` div is in template
3. Check browser console for errors

### Help content not loading
1. Verify markdown file path is correct
2. Check `ux-markdown` component is working
3. Look for compilation errors in build output

### Popover not responding
1. Check `help.js` is loaded
2. Verify no JavaScript console errors
3. Try clearing browser cache

### Styling issues
1. Check CSS specificity (help styles should override)
2. Verify CSS variables are defined
3. Check for conflicting hover states

## Questions?

Check the help pages in the app for detailed user documentation!

---

**Created**: 2024
**Help System Version**: 1.0
**Last Updated**: 2024
