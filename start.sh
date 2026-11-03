#!/bin/sh
set -e

# Ensure persistent data directory exists
mkdir -p /data 2>/dev/null || true

# Ensure the SQLite database exists in the persistent volume
if [ ! -f /data/dev.db ]; then
  echo "Database not found in /data. Initializing from default dev.db..."
  cp /app/dev.db /data/dev.db
else
  echo "Persistent database found in /data. Proceeding..."
fi

echo "Running additive schema upgrades and category initializer..."
node scripts/initialize-categories.cjs

echo "Starting SabujKuthi Nursery Next.js application on port ${PORT:-3000}..."
exec node server.js
