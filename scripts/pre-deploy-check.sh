#!/bin/bash

# CF-Navs 部署前检查脚本
# 用法: bash scripts/pre-deploy-check.sh

echo "=========================================="
echo "  CF-Navs 部署前检查"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 检查函数
check_pass() {
  echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ERRORS=$((ERRORS + 1))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  WARNINGS=$((WARNINGS + 1))
}

# 1. 检查 Node.js 版本
echo "1. 检查 Node.js 版本..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -ge 18 ]; then
    check_pass "Node.js 版本: $(node -v)"
  else
    check_fail "Node.js 版本过低: $(node -v)，需要 18 或更高版本"
  fi
else
  check_fail "未安装 Node.js"
fi
echo ""

# 2. 检查 npm
echo "2. 检查 npm..."
if command -v npm &> /dev/null; then
  check_pass "npm 版本: $(npm -v)"
else
  check_fail "未安装 npm"
fi
echo ""

# 3. 检查 Wrangler
echo "3. 检查 Wrangler..."
if [ -f "node_modules/.bin/wrangler" ] || command -v wrangler &> /dev/null; then
  check_pass "Wrangler 已安装"
else
  check_fail "未安装 Wrangler，请运行: npm install"
fi
echo ""

# 4. 检查 wrangler.toml 配置
echo "4. 检查 wrangler.toml 配置..."
if [ -f "wrangler.toml" ]; then
  check_pass "wrangler.toml 文件存在"

  WRANGLER_CONFIG="wrangler.toml"
  if [ -f "wrangler.local.toml" ]; then
    WRANGLER_CONFIG="wrangler.local.toml"
    check_pass "检测到本地部署配置: wrangler.local.toml"
  fi

  # 检查 D1 配置
  if grep -Eq "replace-with-your-d1-database-id|database_id[[:space:]]*=[[:space:]]*\"REPLACE_WITH_YOUR_D1_ID\"" "$WRANGLER_CONFIG"; then
    check_fail "D1 database_id 仍是占位符，请运行: npm run setup:wrangler"
  elif grep -Eq "^[[:space:]]*database_id[[:space:]]*=" "$WRANGLER_CONFIG"; then
    check_pass "D1 database_id 已配置"
  else
    check_pass "D1 使用 Cloudflare 自动资源配置"
  fi

  # 检查 KV 配置
  if grep -Eq "replace-with-your-kv-namespace-id|id[[:space:]]*=[[:space:]]*\"REPLACE_WITH_YOUR_KV_ID\"" "$WRANGLER_CONFIG"; then
    check_fail "KV namespace id 仍是占位符，请运行: npm run setup:wrangler"
  elif grep -Eq "^[[:space:]]*id[[:space:]]*=" "$WRANGLER_CONFIG"; then
    check_pass "KV namespace id 已配置"
  else
    check_pass "KV 使用 Cloudflare 自动资源配置"
  fi
else
  check_fail "wrangler.toml 文件不存在"
fi
echo ""

# 5. 检查依赖安装
echo "5. 检查依赖..."
if [ -d "node_modules" ]; then
  check_pass "依赖已安装"
else
  check_fail "依赖未安装，请运行: npm install"
fi
echo ""

# 6. 检查构建
echo "6. 检查前端构建..."
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  check_pass "前端已构建"
else
  check_warn "前端未构建，部署前会自动构建"
fi
echo ""

# 7. 检查数据库 schema
echo "7. 检查数据库 schema..."
if [ -f "schema.sql" ]; then
  check_pass "schema.sql 文件存在"
else
  check_fail "schema.sql 文件不存在"
fi
echo ""

# 8. TypeScript 类型检查
echo "8. 运行类型检查..."
if npm run type-check &> /dev/null; then
  check_pass "TypeScript 类型检查通过"
else
  check_warn "TypeScript 类型检查有警告，但不影响部署"
fi
echo ""

# 9. 检查 .dev.vars
echo "9. 检查本地开发配置..."
if [ -f ".dev.vars" ]; then
  check_pass ".dev.vars 文件存在（用于本地开发）"
else
  check_warn ".dev.vars 不存在，本地开发时需要创建"
fi
echo ""

# 总结
echo "=========================================="
echo "  检查完成"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ 所有必需项检查通过！${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ 有 $WARNINGS 个警告，但不影响部署${NC}"
  fi
  echo ""
  echo "下一步："
  echo "1. 设置管理员密码: npx wrangler secret put INIT_ADMIN_PASSWORD"
  echo "2. 初始化数据库: npm run db:init:remote"
  echo "3. 部署: npm run deploy"
  exit 0
else
  echo -e "${RED}✗ 发现 $ERRORS 个错误，请修复后再部署${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ 还有 $WARNINGS 个警告${NC}"
  fi
  exit 1
fi
