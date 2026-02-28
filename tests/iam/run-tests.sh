#!/usr/bin/env sh
#
# IAM Test Suite Runner
# Quick reference for executing IAM tests
#

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${BLUE}UX3 IAM Test Suite${NC}"
echo "=================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
  echo "${RED}Error: npm is not installed${NC}"
  exit 1
fi

# Show menu
echo "${YELLOW}Available commands:${NC}"
echo ""
echo "  ${GREEN}npm test -- tests/iam${NC}"
echo "    Run all IAM tests"
echo ""
echo "  ${GREEN}npm test -- tests/iam/fsms.test.ts${NC}"
echo "    Run FSM transition tests (32 tests)"
echo ""
echo "  ${GREEN}npm test -- tests/iam/rendering.test.ts${NC}"
echo "    Run view rendering tests"
echo ""
echo "  ${GREEN}npm test -- tests/iam/events.test.ts${NC}"
echo "    Run event binding tests (30+ tests)"
echo ""
echo "  ${GREEN}npm test -- tests/iam/integration.test.ts${NC}"
echo "    Run integration/end-to-end tests (20+ flows)"
echo ""
echo "  ${GREEN}npm test:watch -- tests/iam${NC}"
echo "    Run tests in watch mode (auto-rerun on changes)"
echo ""
echo "  ${GREEN}npm test -- tests/iam --coverage${NC}"
echo "    Run with coverage report"
echo ""

# Run tests if argument provided
if [ -n "$1" ]; then
  case "$1" in
    "all")
      echo "${YELLOW}Running all IAM tests...${NC}"
      npm test -- tests/iam
      ;;
    "fsm")
      echo "${YELLOW}Running FSM tests...${NC}"
      npm test -- tests/iam/fsms.test.ts
      ;;
    "rendering")
      echo "${YELLOW}Running rendering tests...${NC}"
      npm test -- tests/iam/rendering.test.ts
      ;;
    "events")
      echo "${YELLOW}Running event tests...${NC}"
      npm test -- tests/iam/events.test.ts
      ;;
    "integration")
      echo "${YELLOW}Running integration tests...${NC}"
      npm test -- tests/iam/integration.test.ts
      ;;
    "watch")
      echo "${YELLOW}Running tests in watch mode...${NC}"
      npm test:watch -- tests/iam
      ;;
    "coverage")
      echo "${YELLOW}Running tests with coverage...${NC}"
      npm test -- tests/iam --coverage
      ;;
    *)
      echo "${YELLOW}Unknown command: $1${NC}"
      echo "Available: all, fsm, rendering, events, integration, watch, coverage"
      exit 1
      ;;
  esac
fi
