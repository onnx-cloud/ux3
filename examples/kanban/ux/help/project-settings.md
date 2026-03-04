# Project Settings - Configure Your Project

Project settings control how your project works, who can access it, and how it appears to your team.

## Basic Settings

### Project Details
- **Name**: Display name for your project
- **Description**: What the project is about
- **Status**: Active, On Hold, Archived
- **Visibility**: Public, Private, or Team-only

### Project Image
- Set a project avatar or banner
- Helps identify projects quickly
- Visible in project list and navigation

## Team & Access

### Members
- **Add Members**: Invite people to the project
- **Roles**: Assign permissions (Owner, Editor, Viewer)
- **Remove Members**: Revoke access
- **Member List**: See who has access

### Permissions

| Role | Can View | Can Edit | Can Delete | Can Settings |
|------|----------|----------|-----------|---------------|
| **Owner** | ✓ | ✓ | ✓ | ✓ |
| **Editor** | ✓ | ✓ | ✓ | ✗ |
| **Viewer** | ✓ | ✗ | ✗ | ✗ |

### Access Control
- **Public Projects**: Anyone with link can view
- **Private Projects**: Only members can access
- **Team Projects**: Only your organization members

## Workflow Configuration

### Labels
- Create custom labels for your project
- Examples: "bug", "feature", "documentation", "urgent"
- Use consistently across tasks
- Define label colors for visual coding

### Fields
- Add custom task fields (beyond standard ones)
- Examples: "Sprint", "Component", "Risk Level"
- Only applies to this project
- Available in all tasks

### Automation Rules
- Auto-assign new tasks
- Auto-move tasks based on conditions
- Auto-archive old tasks
- Send notifications for specific events

## Templates

### Board Templates
- Save your lane configuration as template
- Reuse across multiple boards
- Speed up setup for new boards

### Task Templates
- Pre-configured task types
- Includes default fields, labels, checklist items
- Examples: "Bug Report", "Feature Request", "Documentation"

## Notifications

### Project Alerts
- Notify on new tasks
- Notify on task assignment
- Notify on mentions
- Notify on activity

### Notification Settings
- Choose channels: Email, In-app, Slack
- Set frequency: Real-time, Daily digest, Weekly summary
- Quiet hours: Pause notifications during off hours

## Integrations

### Connected Tools
- Link to version control (GitHub, GitLab)
- Connect to communication tools (Slack, Teams)
- Integrate CI/CD pipelines
- Sync with external systems

### Webhooks
- Trigger external actions when tasks change
- Push data to other tools
- Custom automations

## Data & Backup

### Export
- Download project as CSV, JSON, or Excel
- Useful for reporting and archival
- Includes all tasks, boards, and history

### Archive
- Archive completed projects
- Data is preserved but hidden
- Can restore later if needed

### Delete
- Permanently remove project
- ⚠️ **Warning**: Cannot be undone
- Exports data before deletion is recommended

## Advanced Settings

### Organization
- Link project to organization/team
- Set project hierarchy
- Manage cross-project dependencies

### Custom Workflow
- Define custom task statuses
- Set transition rules
- Enforce approval workflows

### Performance
- Archive old tasks automatically
- Limit task history depth
- Optimize board loading

## Tips

💡 **Name clearly**: Use descriptive project names for easy identification

💡 **Set permissions early**: Define roles before adding team members

💡 **Create labels**: Consistent labels improve filtering and organization

💡 **Regular backups**: Export important projects periodically

💡 **Review settings quarterly**: Adjust as your project evolves

## Common Setup Scenarios

### Startup Team (Small)
- 1-2 boards per project
- Simple permission model
- 5-7 lanes, basic labels

### Enterprise Project (Large)
- Multiple boards with templates
- Granular permissions
- Custom fields and automation
- Integrations with CI/CD

### Distributed Team
- Time zone awareness
- Async-friendly workflow
- Slack notifications
- Regular digest emails

---

**Security Note**: Be careful with project visibility settings. Review permissions periodically!
