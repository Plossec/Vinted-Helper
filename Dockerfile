# Image de l'application : serveur Node + interface compilée.

# --- Étape 1 : construction (avec les outils de développement) ---
FROM node:22-alpine AS construction
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build

# --- Étape 2 : image finale (dépendances de production uniquement) ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=construction /app/server/dist server/dist
COPY --from=construction /app/server/drizzle server/drizzle
COPY --from=construction /app/client/dist client/dist
RUN mkdir -p data/photos && chown -R node:node data
USER node
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
