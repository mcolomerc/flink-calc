#!/bin/bash

# Initial Git Setup for Flink Calculator
# Run this script once to set up the repository

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Setting up Flink Calculator repository${NC}"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    echo "Install git: brew install git"
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo -e "${BLUE}📦 Initializing git repository...${NC}"
    git init
else
    echo -e "${GREEN}✅ Git repository already initialized${NC}"
fi

# Add remote
if ! git remote | grep -q "origin"; then
    echo -e "${BLUE}🔗 Adding remote repository...${NC}"
    git remote add origin https://github.com/mcolomerc/flink-calc.git
    echo -e "${GREEN}✅ Remote added${NC}"
else
    echo -e "${GREEN}✅ Remote already configured${NC}"
    git remote -v
fi

# Add all files
echo ""
echo -e "${BLUE}📝 Staging files...${NC}"
git add .

# Show what will be committed
echo ""
echo -e "${BLUE}📋 Files to be committed:${NC}"
git status --short

# Commit
echo ""
read -p "Enter commit message (or press Enter for default): " commit_msg
if [ -z "$commit_msg" ]; then
    commit_msg="Initial commit - Flink Calculator with GitHub Pages deployment"
fi

git commit -m "$commit_msg"
echo -e "${GREEN}✅ Changes committed${NC}"

# Push to main
echo ""
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git branch -M main
git push -u origin main

echo ""
echo -e "${GREEN}✅ Repository setup complete!${NC}"
echo ""
echo -e "${BLUE}📊 Next steps:${NC}"
echo "1. Go to https://github.com/mcolomerc/flink-calc/settings/pages"
echo "2. Under 'Source', select 'GitHub Actions'"
echo "3. Run: ./deploy.sh"
echo "   Or: git tag v1.0.0 && git push origin v1.0.0"
echo ""
echo -e "${BLUE}🌐 Your site will be live at:${NC}"
echo "   https://mcolomerc.github.io/flink-calc/"
