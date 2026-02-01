FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker caching
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile --production

# Copy the rest of the application code
COPY --chown=node:node . .

# Set the user to node
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]