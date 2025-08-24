# SnapFlow Ignore Patterns

SnapFlow automatically ignores certain files and folders to prevent tracking sensitive or unnecessary information. This helps keep your development context clean and focused on actual code changes.

## How It Works

The `.snapflowignore` file uses the same pattern syntax as `.gitignore`, making it familiar and easy to use. Files that match these patterns will not be tracked for changes, even if they're modified while a SnapFlow session is active.

## Default Ignored Patterns

If no `.snapflowignore` file exists, SnapFlow automatically ignores:

### Environment & Configuration

- `.env*` - All environment files
- `.snapflow/` - SnapFlow's own data directory
- `.snapflowignore` - The ignore file itself

### Dependencies & Build Artifacts

- `node_modules/` - NPM dependencies
- `dist/`, `build/` - Build output directories
- `*.min.js`, `*.min.css` - Minified files

### System & IDE Files

- `.vscode/`, `.idea/` - Editor configuration
- `*.swp`, `*.swo` - Vim swap files
- `.DS_Store`, `Thumbs.db` - OS-generated files

### Version Control & Testing

- `.git/` - Git repository data
- `coverage/` - Test coverage reports
- `*.lcov` - Coverage data files

## Creating a Custom .snapflowignore

Create a `.snapflowignore` file in your workspace root to customize what gets ignored:

```bash
# Example .snapflowignore
.env
.secrets
config/local.json
temp/
*.tmp
logs/
vendor/
```

## Pattern Syntax

### Basic Patterns

- `*.log` - Ignore all .log files
- `temp/` - Ignore temp directory and all contents
- `.env` - Ignore specific file

### Advanced Patterns

- `src/**/*.test.ts` - Ignore all test files in src subdirectories
- `!src/**/*.spec.ts` - But track .spec.ts files (negation)
- `config/*.json` - Ignore JSON config files in config directory

## Examples

### Ignore Sensitive Files

```bash
# .snapflowignore
.env
.secrets
config/production.json
keys/
```

### Ignore Build Output

```bash
# .snapflowignore
dist/
build/
*.min.js
*.min.css
coverage/
```

### Ignore IDE Files

```bash
# .snapflowignore
.vscode/
.idea/
*.swp
*.swo
*~
```

## Benefits

1. **Privacy**: Sensitive files like `.env` are never tracked
2. **Performance**: Reduces unnecessary change monitoring
3. **Focus**: Only tracks meaningful development work
4. **Storage**: Prevents bloating change logs with irrelevant data

## Integration

The ignore system is automatically integrated with:

- **ChangeTracker**: Filters out ignored files from change recording
- **Edit Sessions**: Only creates sessions for relevant files
- **LLM Analysis**: Provides cleaner context for AI analysis

## Troubleshooting

### File Still Being Tracked?

1. Check if the pattern is correct in `.snapflowignore`
2. Ensure the file path is relative to workspace root
3. Restart the SnapFlow extension to reload patterns

### Pattern Not Working?

1. Verify pattern syntax (use `*` for wildcards)
2. Check for typos in file paths
3. Use forward slashes `/` even on Windows

### Need to Track Previously Ignored File?

1. Remove or modify the pattern in `.snapflowignore`
2. Use negation with `!` to override parent patterns
3. Restart SnapFlow to apply changes

## Best Practices

1. **Start Simple**: Begin with basic patterns and add complexity as needed
2. **Be Specific**: Use specific patterns rather than overly broad ones
3. **Test Patterns**: Verify patterns work as expected with your file structure
4. **Document**: Add comments to explain why certain patterns exist
5. **Review Regularly**: Periodically review and update ignore patterns

## Example .snapflowignore

```bash
# Environment and secrets
.env*
.secrets
config/*.local.json

# Dependencies and build
node_modules/
dist/
build/
*.min.*

# IDE and system
.vscode/
.idea/
*.swp
.DS_Store

# Logs and temp
logs/
temp/
*.log
*.tmp

# But track these specific files
!src/**/*.spec.ts
!docs/**/*.md
```
