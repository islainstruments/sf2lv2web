# Use the official Docker-in-Docker image as the base image
FROM docker:23.0.1-dind
RUN apk add --no-cache nodejs npm
WORKDIR /usr/src/app 
COPY package*.json ./
RUN npm install 
COPY . . 
RUN npm run build
RUN npm install uuid
EXPOSE 4001
CMD ["npm", "start"]
