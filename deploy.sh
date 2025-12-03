#!/bin/bash

# Flink Calculator - Quick Deploy Script
# This script helps you create and push tags for GitHub Pages deployment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Flink Calculator - GitHub Pages Deployment${NC}"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    echo "Run: git init && git remote add origin https://github.com/mcolomerc/flink-calc.git"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo ""
    git status --short
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo -e "${YELLOW}⚠️  Proceeding with uncommitted changes...${NC}"
    fi
fi

# Get current tags
echo -e "${BLUE}📋 Current tags:${NC}"
git tag -l || echo "No tags yet"
echo ""

# Ask for new tag version
read -p "Enter new version tag (e.g., v1.0.0): " version

# Validate version format
if [[ ! $version =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: Invalid version format. Use v1.0.0 format${NC}"
    exit 1
fi

# Check if tag already exists
if git rev-parse "$version" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Tag $version already exists${NC}"
    echo "Use: git tag -d $version  # to delete locally"
    echo "Use: git push origin --delete $version  # to delete remotely"
    exit 1
fi

# Optional: Add tag message
read -p "Enter tag message (optional, press Enter to skip): " tag_message

# Push to main first (if needed)
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    echo -e "${YELLOW}⚠️  You're on branch '$current_branch', not 'main'${NC}"
    read -p "Switch to main and push? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main
        git push origin main
    fi
else
    echo -e "${BLUE}📤 Pushing to main...${NC}"
    git push origin main || echo -e "${YELLOW}⚠️  Already up to date${NC}"
fi

# Create and push tag
echo ""
echo -e "${BLUE}🏷️  Creating tag $version...${NC}"
if [ -z "$tag_message" ]; then
    git tag "$version"
else
    git tag -a "$version" -m "$tag_message"
fi

echo -e "${BLUE}📤 Pushing tag to GitHub...${NC}"
git push origin "$version"

echo ""
echo -e "${GREEN}✅ Success! Deployment triggered${NC}"
echo ""
echo -e "${BLUE}📊 Monitor deployment:${NC}"
echo "   https://github.com/mcolomerc/flink-calc/actions"
echo ""
echo -e "${BLUE}🌐 Your site will be live at:${NC}"
echo "   https://mcolomerc.github.io/flink-calc/"
echo ""
echo -e "${YELLOW}⏱️  Deployment usually takes 2-3 minutes${NC}"
