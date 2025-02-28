# Use the official Node.js 21 image as the base image
FROM node:21

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package.json package-lock.json ./

# Install dependencies inside the container
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose port 3000 (the port your app will listen to)
EXPOSE 3000

# Start the application using the command 'npm run dev' (assuming you're using Vite)
CMD ["npm", "run", "dev"]
