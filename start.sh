#!/bin/bash
set -e

cd "$(dirname "$0")/server"

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
