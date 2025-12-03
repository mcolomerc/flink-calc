# Deploy to GitHub Pages

## Quick Start Guide

### 1. Push Code to GitHub

```bash
cd /Users/mcolomerc/flink-calc

# Initialize git (if not already done)
git init

# Add remote repository
git remote add origin https://github.com/mcolomerc/flink-calc.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - Flink Calculator"

# Push to main branch
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository: https://github.com/mcolomerc/flink-calc
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select:
   - Source: **GitHub Actions**
4. Click **Save**

### 3. Create and Push a Tag

```bash
# Create a version tag
git tag v1.0.0

# Push the tag to GitHub
git push origin v1.0.0
```

✨ **That's it!** The GitHub Action will automatically:
1. Build your application
2. Deploy to GitHub Pages

Your site will be available at: **https://mcolomerc.github.io/flink-calc/**

---

## How It Works

### GitHub Action Workflow

The workflow (`.github/workflows/deploy.yml`) triggers when you push a version tag (e.g., `v1.0.0`, `v2.1.3`).

**Trigger pattern**: `v*.*.*` (semantic versioning)

**What happens:**
1. ✅ Checks out your code
2. ✅ Sets up Node.js 20
3. ✅ Installs dependencies
4. ✅ Builds the application
5. ✅ Uploads build artifacts
6. ✅ Deploys to GitHub Pages

---

## Deployment Commands

### Initial Setup
```bash
# Push code to GitHub
git init
git remote add origin https://github.com/mcolomerc/flink-calc.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Deploy New Version
```bash
# Make your changes
git add .
git commit -m "Your commit message"
git push origin main

# Create and push a tag to trigger deployment
git tag v1.0.1
git push origin v1.0.1
```

### View Deployments
```bash
# Check deployment status
gh run list --workflow=deploy.yml

# Or visit: https://github.com/mcolomerc/flink-calc/actions
```

---

## Tag Naming Convention

Use semantic versioning: `vMAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (v2.0.0)
- **MINOR**: New features (v1.1.0)
- **PATCH**: Bug fixes (v1.0.1)

Examples:
```bash
git tag v1.0.0   # Initial release
git tag v1.0.1   # Bug fix
git tag v1.1.0   # New feature
git tag v2.0.0   # Breaking changes
```

---

## Useful Git Commands

### List Tags
```bash
git tag -l
```

### Delete Local Tag
```bash
git tag -d v1.0.0
```

### Delete Remote Tag
```bash
git push origin --delete v1.0.0
```

### View Tag Details
```bash
git show v1.0.0
```

### Create Annotated Tag (with message)
```bash
git tag -a v1.0.0 -m "Release version 1.0.0 - Initial production release"
git push origin v1.0.0
```

---

## Troubleshooting

### Issue: GitHub Pages shows 404
**Solution**: 
1. Check Settings → Pages is enabled with "GitHub Actions" source
2. Wait 2-3 minutes after deployment
3. Verify the workflow completed successfully

### Issue: Deployment fails
**Solution**: 
1. Check Actions tab: https://github.com/mcolomerc/flink-calc/actions
2. Click on the failed run to see logs
3. Common fixes:
   - Ensure `package-lock.json` is committed
   - Check all dependencies are in `package.json`

### Issue: Site works but routes show 404
**Solution**: This is already handled! The Vite config sets the correct base path.

### Issue: Assets not loading
**Solution**: The `base: '/flink-calc/'` in `vite.config.js` ensures all asset paths are correct.

---

## Local Testing Before Deploy

Test the production build locally:

```bash
# Build for production
npm run build

# Preview the build
npm run preview

# Visit: http://localhost:4173/flink-calc/
```

---

## GitHub Pages Configuration

Your site will be available at:
- **URL**: https://mcolomerc.github.io/flink-calc/
- **Branch**: Deployed from `gh-pages` branch (automatically created)
- **Source**: GitHub Actions

---

## Advanced: Deploy on Push to Main (Alternative)

If you want to deploy on every push to main instead of tags, create `.github/workflows/deploy-on-push.yml`:

```yaml
name: Deploy on Push

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
  
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## CI/CD Best Practices

1. **Always test locally** before creating a tag
2. **Use semantic versioning** for clear version history
3. **Write meaningful commit messages**
4. **Check Actions tab** after pushing a tag to monitor deployment
5. **Keep dependencies updated** with `npm audit` and `npm update`

---

## File Changes Made

✅ `.github/workflows/deploy.yml` - GitHub Action for tag-based deployment
✅ `vite.config.js` - Updated with correct base path for GitHub Pages
✅ `GITHUB-PAGES-DEPLOY.md` - This documentation

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Enable GitHub Pages in repository settings
3. ✅ Create and push a tag (`v1.0.0`)
4. ✅ Wait for deployment (2-3 minutes)
5. ✅ Visit https://mcolomerc.github.io/flink-calc/

🎉 **Your Flink Calculator will be live!**
