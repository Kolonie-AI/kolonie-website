# Build the static site, then serve it from nginx. Two stages, because the
# runtime image has no reason to contain node_modules or a toolchain.

FROM node:22-alpine AS build
WORKDIR /app

# Copy the manifests first so a content-only change reuses the install layer.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.29-alpine AS runtime

# The site is fully static; nginx serves it and nothing else. The default
# config is replaced so that a missing path returns the site's own 404 page
# (`src/pages/404.astro`) rather than nginx's.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# The healthcheck in docker-compose.yml wgets / on this port. Traefik routes
# kolonie.ai here; TLS terminates at Traefik, so nothing here speaks HTTPS.
