# 🚀 Quick Start - GitHub Pages Deployment

## One-Time Setup

```bash
# 1. Push code to GitHub
./setup-git.sh

# 2. Enable GitHub Pages
# Go to: https://github.com/mcolomerc/flink-calc/settings/pages
# Set Source: GitHub Actions

# 3. Deploy first version
./deploy.sh
# Enter: v1.0.0
```

## Deploy New Versions

```bash
# Option 1: Using helper script (recommended)
./deploy.sh

# Option 2: Manual
git add .
git commit -m "Your changes"
git push origin main
git tag v1.0.1
git push origin v1.0.1
```

## Your Live Site

🌐 **URL**: https://mcolomerc.github.io/flink-calc/

📊 **Monitor**: https://github.com/mcolomerc/flink-calc/actions

⏱️ **Deploy time**: 2-3 minutes after pushing tag

## Common Commands

```bash
# List tags
git tag -l

# Delete tag locally
git tag -d v1.0.0

# Delete tag remotely
git push origin --delete v1.0.0

# View deployment status
git log --oneline --decorate

# Test production build locally
npm run build && npm run preview
```

## Versioning Guide

- `v1.0.0` - Initial release
- `v1.0.1` - Bug fixes
- `v1.1.0` - New features
- `v2.0.0` - Breaking changes

## Troubleshooting

❌ **404 Error**: Wait 2-3 minutes, check GitHub Actions
❌ **Assets not loading**: Verify `base` in `vite.config.js`
❌ **Workflow fails**: Check Actions tab for error logs

## Files Created

- `.github/workflows/deploy.yml` - Deployment automation
- `vite.config.js` - Updated with base path
- `setup-git.sh` - Initial setup script
- `deploy.sh` - Quick deploy script
- `GITHUB-PAGES-DEPLOY.md` - Full documentation

---

**Need help?** See [GITHUB-PAGES-DEPLOY.md](GITHUB-PAGES-DEPLOY.md)
