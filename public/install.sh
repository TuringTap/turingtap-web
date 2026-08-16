#!/bin/sh
# TuringTap agent installer — https://turingtap.ai
# Usage: curl -fsSL https://turingtap.ai/install.sh | sh
# Downloads the latest turingtap-agent release from GitHub, verifies the
# checksum, and installs to /usr/local/bin (or ~/.local/bin without sudo).
set -eu

REPO="turingtap/turingtap-agent"
API="https://api.github.com/repos/$REPO/releases/latest"

os=$(uname -s | tr '[:upper:]' '[:lower:]')
arch=$(uname -m)
case "$arch" in
  x86_64|amd64) arch=amd64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) echo "unsupported arch: $arch" >&2; exit 1 ;;
esac
case "$os" in
  linux|darwin) ;;
  *) echo "unsupported OS: $os (Windows: download the zip from github.com/$REPO/releases)" >&2; exit 1 ;;
esac

echo "-> fetching latest release info"
json=$(curl -fsSL "$API")
tag=$(printf '%s' "$json" | grep -o '"tag_name": *"[^"]*"' | head -1 | cut -d'"' -f4)
ver=${tag#v}
asset="turingtap-agent_${ver}_${os}_${arch}.tar.gz"
url="https://github.com/$REPO/releases/download/$tag/$asset"
sumurl="https://github.com/$REPO/releases/download/$tag/checksums.txt"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
echo "-> downloading $asset ($tag)"
curl -fsSL -o "$tmp/$asset" "$url"
curl -fsSL -o "$tmp/checksums.txt" "$sumurl"

echo "-> verifying checksum"
(cd "$tmp" && grep " $asset\$" checksums.txt | sha256sum -c - >/dev/null 2>&1) || \
(cd "$tmp" && grep " $asset\$" checksums.txt | shasum -a 256 -c - >/dev/null) || {
  echo "checksum verification failed" >&2; exit 1; }

tar -xzf "$tmp/$asset" -C "$tmp"

dest="/usr/local/bin"
if [ ! -w "$dest" ]; then
  if command -v sudo >/dev/null 2>&1; then
    echo "-> installing to $dest (sudo)"
    sudo install -m 0755 "$tmp/turingtap-agent" "$dest/turingtap-agent"
  else
    dest="$HOME/.local/bin"; mkdir -p "$dest"
    echo "-> installing to $dest (add it to PATH if needed)"
    install -m 0755 "$tmp/turingtap-agent" "$dest/turingtap-agent"
  fi
else
  echo "-> installing to $dest"
  install -m 0755 "$tmp/turingtap-agent" "$dest/turingtap-agent"
fi

echo ""
echo "turingtap-agent $tag installed."
echo "Next: grab an API key at https://turingtap.ai/account#keys then run:"
echo "  turingtap-agent --api-key ttk_live_..."
echo "Docs: https://turingtap.ai/docs"
