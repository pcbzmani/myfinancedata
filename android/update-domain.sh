#!/usr/bin/env bash
# =============================================================================
# PanamKasu TWA — Domain migration: pcbzmani.netlify.app → panamkasu.netlify.app
#
# Run this script from the ROOT of your local bubblewrap Android project folder.
# It patches all files that reference the old domain in-place.
#
# Usage:
#   cd /path/to/your/twa-android-project
#   bash update-domain.sh
# =============================================================================

set -e

OLD="pcbzmani.netlify.app"
NEW="panamkasu.netlify.app"

echo "🔄  Migrating TWA domain: $OLD → $NEW"
echo ""

# Detect OS for sed compatibility (macOS needs -i '')
SED_INPLACE=(-i)
if [[ "$(uname)" == "Darwin" ]]; then
  SED_INPLACE=(-i '')
fi

patch_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    sed "${SED_INPLACE[@]}" "s|$OLD|$NEW|g" "$file"
    echo "  ✅  $file"
  else
    echo "  ⚠️   $file not found (skipped)"
  fi
}

echo "📁  Patching Android project files..."
patch_file "twa-manifest.json"
patch_file "app/src/main/res/values/strings.xml"
patch_file "app/src/main/AndroidManifest.xml"
patch_file "app/build.gradle"
patch_file "app/build.gradle.kts"
patch_file "build.gradle"
patch_file "build.gradle.kts"

# Also do a recursive patch on any remaining XML/Gradle files in case bubblewrap
# embedded the URL elsewhere
echo ""
echo "🔍  Scanning for any remaining references..."
if grep -r "$OLD" app/ --include="*.xml" --include="*.gradle" --include="*.kts" --include="*.json" -l 2>/dev/null; then
  echo "   Patching the above files..."
  grep -r "$OLD" app/ --include="*.xml" --include="*.gradle" --include="*.kts" --include="*.json" -l 2>/dev/null \
    | xargs sed "${SED_INPLACE[@]}" "s|$OLD|$NEW|g"
  echo "  ✅  All remaining references patched"
else
  echo "  ✅  No remaining references found"
fi

echo ""
echo "🏗️   Now rebuild the APK/AAB:"
echo ""
echo "   Option A — use bubblewrap (recommended):"
echo "     bubblewrap build"
echo ""
echo "   Option B — use Gradle directly:"
echo "     ./gradlew bundleRelease      # produces .aab for Play Store"
echo "     ./gradlew assembleRelease    # produces .apk for sideload"
echo ""
echo "📦  Then upload the new release to Play Store:"
echo "   Google Play Console → PanamKasu → Production → Create new release"
echo "   Upload the .aab from: app/build/outputs/bundle/release/"
echo ""
echo "✅  Domain migration complete!"
