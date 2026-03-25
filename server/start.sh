#!/bin/bash
set -e

npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
