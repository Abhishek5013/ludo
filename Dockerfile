FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY .npmrc ./

# Install all dependencies (legacy peer deps prevents ERESOLVE conflicts)
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build Vite frontend into /dist
RUN npm run build

# Set production environment
ENV NODE_ENV=production

# Render/Railway assign dynamic PORT env variable
EXPOSE 3000

CMD ["npm", "start"]
