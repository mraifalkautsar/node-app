FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker caching
COPY --chown=node:node package*.json ./

# Install dependencies and pm2
RUN npm install --frozen-lockfile --production
RUN npm install pm2 -g

# Copy the rest of the application code
COPY --chown=node:node . .

# Set the user to node
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application with pm2
CMD ["npm", "start"]