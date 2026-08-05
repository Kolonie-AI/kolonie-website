# Build the static site, then serve it from nginx. Two stages, because the
# runtime image has no reason to contain node_modules or a toolchain.

FROM node:22-alpine AS build
WORKDIR /app

# Copy the manifests first so a content-only change reuses the install layer.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# The site's id in Umami (kolonie-website#43).
#
# It has to arrive at *build* time, because the site is static: `astro build`
# writes the id into the tag on every page, and nothing at runtime can add it
# afterwards. An image built without it serves no analytics tag at all and every
# page still loads — see `src/lib/analytics.ts`, where absent is a supported
# state rather than a misconfiguration.
#
# It is not a secret. The id is served to every visitor in the tag, identifies a
# site rather than a person, and grants nothing — the dashboard behind it is not
# exposed to the internet. It is a repository *variable*, not a repository
# secret, so it is readable by anyone who can read the workflow, which is the
# honest place for a value that ships in the HTML.
ARG PUBLIC_UMAMI_WEBSITE_ID=""
ENV PUBLIC_UMAMI_WEBSITE_ID=$PUBLIC_UMAMI_WEBSITE_ID

RUN npm run build

FROM nginx:1.29-alpine AS runtime

# The site is fully static; nginx serves it and nothing else. The default
# config is replaced so that a missing path returns Starlight's own 404 page
# rather than nginx's.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# The healthcheck in docker-compose.yml wgets / on this port. Traefik routes
# kolonie.ai here; TLS terminates at Traefik, so nothing here speaks HTTPS.
