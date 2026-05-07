# component template

## Available Tokens

| Token | Example | Description |
|-------|---------|-------------|
| `[[ name ]]` | `my-widget` | kebab-case name |
| `[[ Name ]]` | `MyWidget` | PascalCase name |
| `[[ name_snake ]]` | `my_widget` | snake_case name |
| `[[ NAME ]]` | `MY_WIDGET` | UPPER_SNAKE name |
| `[[ year ]]` | `2026` | Current year |
| `[[ date ]]` | `2026-05-07` | Current ISO date |
| `[[ ux3Version ]]` | `0.2.1` | Installed UX3 version |

## Output Files

```
src/components/[[ Name ]]/index.ts
ux/widget/[[ name ]].yaml
ux/widget/[[ name ]]/index.html
```

## Integration Points

1. Import component in `src/index.ts`
2. Register in `ux3.yaml` widget list
3. Wire FSM states / events in the YAML view definition
4. Add i18n keys for any text in the HTML template
