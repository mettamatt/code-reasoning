# Version Management and npm Publishing

This document provides detailed information about managing versions and publishing the Code-Reasoning MCP Server to npm. It covers the semantic versioning system, step-by-step instructions for updating and publishing new versions, and best practices for version management.

## Table of Contents

- [Version Update Workflow](#version-update-workflow)
- [Semantic Versioning](#semantic-versioning)
- [Publishing Process](#publishing-process)
  - [Prerequisites](#prerequisites)
  - [Step-by-Step Publishing Guide](#step-by-step-publishing-guide)
  - [Publishing with Scope](#publishing-with-scope)
- [Best Practices](#best-practices)
  - [Managing Changelog](#managing-changelog)
  - [Git Integration](#git-integration)
  - [Version Testing](#version-testing)
- [Troubleshooting](#troubleshooting)

## Version Update Workflow

When updating the Code-Reasoning MCP Server, follow this workflow to ensure proper versioning and publishing:

1. **Make code changes** - Implement new features, fix bugs, or make improvements
2. **Test your changes** - Run tests to verify functionality
3. **Update documentation** - Ensure documentation reflects your changes
4. **Determine version increment** - Based on semantic versioning principles
5. **Bump the version** - Update the version number in package.json
6. **Build the package** - Compile the TypeScript code
7. **Publish to npm** - Make the new version available

### Basic Update Example

```bash
# 1. Make code changes
vim src/server.ts

# 2. Test your changes
npm run test

# 3. Ensure documentation is updated if needed
vim docs/examples.md

# 4-5. Bump version (patch, minor, or major)
npm version patch

# 6. Build the package
npm run build

# 7. Publish to npm
npm publish --access public
```

## Semantic Versioning

The Code-Reasoning MCP Server follows [semantic versioning](https://semver.org/) (semver) principles. The version number format is `MAJOR.MINOR.PATCH`:

| Increment | When to use | Example | Command |
|-----------|-------------|---------|---------|
| PATCH | Bug fixes and minor changes | 0.2.0 → 0.2.1 | `npm version patch` |
| MINOR | New features (backward compatible) | 0.2.1 → 0.3.0 | `npm version minor` |
| MAJOR | Breaking changes | 0.3.0 → 1.0.0 | `npm version major` |

### Version Command Behavior

The `npm version` command:
1. Updates the version in package.json
2. Creates a Git commit with the version change
3. Creates a Git tag for the version

Example:
```bash
# Current version: 0.2.0
npm version patch
# New version: 0.2.1
```

## Publishing Process

### Prerequisites

Before publishing, ensure you have:

1. An npm account
2. Logged in to npm via CLI (`npm login`)
3. Proper permissions for the package scope

### Step-by-Step Publishing Guide

1. **Prepare your package**:
   ```bash
   # Build the package
   npm run build
   ```

2. **Publish the package**:
   ```bash
   # For scoped packages, use --access public
   npm publish --access public
   ```

3. **Verify publication**:
   ```bash
   # Check package info
   npm view @mettamatt/code-reasoning
   ```

### Publishing with Scope

Since Code-Reasoning MCP Server uses the `@mettamatt` scope, always include the `--access public` flag when publishing:

```bash
npm publish --access public
```

Without this flag, npm will attempt to publish as a private package, which requires a paid npm account.

## Best Practices

### Managing Changelog

Maintain a changelog to help users understand what changes in each version:

1. **Create a CHANGELOG.md file** (if not already present)
2. **Document changes for each version**:
   ```markdown
   # Changelog

   ## 0.2.1 (2025-04-25)
   - Fixed bug in thought branching logic
   - Improved error handling in visualizer

   ## 0.2.0 (2025-04-20)
   - Added visualization dashboard
   - Enhanced debugging capabilities
   ```

3. **Update the changelog before publishing** a new version

### Git Integration

Leverage Git integration with npm versioning:

1. **Commit all changes** before bumping version
   ```bash
   git add .
   git commit -m "Implement feature X"
   ```

2. **Use npm version** to automatically create version commit and tag
   ```bash
   npm version patch -m "Bump version to %s - fix thought branching bug"
   ```

3. **Push changes and tags** to your repository
   ```bash
   git push && git push --tags
   ```

### Version Testing

Test your package before publishing:

1. **Run all tests**:
   ```bash
   npm test
   ```

2. **Verify the package builds correctly**:
   ```bash
   npm run build
   ```

3. **Test the package locally**:
   ```bash
   # In your package directory
   npm link

   # In another directory
   npm link @mettamatt/code-reasoning
   ```

## Troubleshooting

### Common Publishing Issues

| Issue | Solution |
|-------|----------|
| "You need to be logged in" | Run `npm login` and enter your credentials |
| "You do not have permission" | Ensure you have the right permissions for the scope |
| "Package name already exists" | Check for naming conflicts or update your version |
| Repository URL warnings | Run `npm pkg fix` to correct package.json format |
| "Invalid version" | Ensure your version follows semver (x.y.z) format |

### Package Unpublishing

You can unpublish a package within 72 hours of publishing:

```bash
# Unpublish a specific version
npm unpublish @mettamatt/code-reasoning@0.2.1

# Unpublish all versions (use with caution)
npm unpublish @mettamatt/code-reasoning --force
```

Note: npm discourages unpublishing packages that others might depend on. Consider deprecating instead:

```bash
npm deprecate @mettamatt/code-reasoning@0.2.1 "Critical bug found, please use version 0.2.2"
```