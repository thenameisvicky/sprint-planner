#!/bin/sh

# Default environment variables for PostgREST if not explicitly provided
export PGRST_DB_URI="${PGRST_DB_URI:-postgresql://neondb_owner:npg_mLaCf3tH1cEe@ep-floral-brook-azngsnjx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require}"
export PGRST_DB_SCHEMA="${PGRST_DB_SCHEMA:-public}"
export PGRST_DB_ANON_ROLE="${PGRST_DB_ANON_ROLE:-neondb_owner}"
export PGRST_SERVER_PORT="${PGRST_SERVER_PORT:-8000}"
export PGRST_SERVER_CORS_ALLOWED_ORIGINS="${PGRST_SERVER_CORS_ALLOWED_ORIGINS:-*}"

# Set internal PostgREST URL for Next.js API proxy
export POSTGREST_URL="${POSTGREST_URL:-http://127.0.0.1:8000}"

echo "Starting PostgREST background process on port $PGRST_SERVER_PORT..."
postgrest &

# Wait briefly for PostgREST to initialize
sleep 1

echo "Starting Next.js standalone server on port ${PORT:-3000}..."
exec node server.js
