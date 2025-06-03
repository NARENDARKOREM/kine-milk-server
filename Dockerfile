# Use Node.js 22 as the base image
FROM node:22-alpine

# Set working directory inside the container
WORKDIR /home/kinemilk/backend

# Copy only package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your source code (excluding node_modules!)
COPY . .

# Add nodemon globally
RUN npm install -g nodemon

# Expose port
EXPOSE 5000

# Default command
CMD ["npm", "start"]

