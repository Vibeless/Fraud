#!/bin/sh
set -e

# Wait-for fallback / logging
echo "Waiting for database and redis to be ready..."

# Run database migrations
echo "Running database migrations..."
npm run migration:run

# Execute the main container command
echo "Starting application..."
exec "$@"
