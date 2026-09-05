#!/usr/bin/env bash
set -euo pipefail

PROFILE="${DSH_PROFILE:-web}"
PACKAGE="@goodandready/dsh-cost-meter"

dsh plugin --profile "$PROFILE" remove dsh-cost-meter || true
dsh plugin --profile "$PROFILE" add "$PACKAGE"
echo "Installed $PACKAGE in profile $PROFILE; restart the profile service through the supported service workflow."
