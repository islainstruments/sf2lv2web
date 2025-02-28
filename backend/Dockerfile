# Use the official Docker-in-Docker image as the base image
FROM docker:23.0.1-dind

# Install additional dependencies if needed (for your Node.js app)
RUN apk add --no-cache nodejs npm

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire application code into the container
COPY . .

# Build the application using TypeScript (if applicable
RUN npm run build
RUN npm install uuid

# Expose the port that your app will run on
EXPOSE 4001

# Start the application
CMD ["npm", "start"]
