FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install all dependencies with hoisting for Docker compatibility
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN echo "shamefully-hoist=true" > .npmrc && pnpm install --frozen-lockfile

# Build
FROM deps AS build
COPY apps/api apps/api
RUN cd apps/api && pnpm build

# Production
FROM node:20-slim
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/main.js"]
