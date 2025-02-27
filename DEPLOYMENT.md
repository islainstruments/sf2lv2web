# Deployment Guide for SF2LV2-WEB

This guide explains how to deploy the SF2LV2-WEB application to a VPS using Docker and CyberPanel (LiteSpeed), making it accessible at sf2lv2.islainstruments.com.

## Testing Cross-Architecture Build Compatibility

Before deploying to a remote server with a different architecture, you can test if your Docker images will build correctly:

```bash
# Make the script executable
chmod +x test-docker-build.sh

# Run the test
./test-docker-build.sh
```

This script will:
1. Set up QEMU emulation for cross-architecture builds
2. Create a Docker buildx builder with multi-architecture support
3. Test building both the builder and backend containers for the opposite architecture
4. Report any issues that might occur on your target server

If the test passes, your Docker images should build correctly on your remote server.

## Quick Deployment with the Automated Script

For a simplified deployment process, you can use the included interactive script:

```bash
# After cloning the repository
chmod +x deploy.sh
sudo ./deploy.sh
```

The script will:
1. Check prerequisites (Docker, Docker Compose)
2. Configure your domain settings
3. Prepare necessary directories
4. Build the frontend 
5. Configure and start Docker containers
6. Guide you through CyberPanel configuration steps

If you prefer a manual approach or need more control, follow the detailed steps below.

## System Requirements

- Ubuntu 20.04 LTS or newer recommended
- Docker and Docker Compose (v2.x+)
- CyberPanel with LiteSpeed Web Server
- Domain with DNS configured for sf2lv2.islainstruments.com
- 2GB RAM minimum (4GB recommended)
- 20GB storage minimum

## Important: Architecture Considerations

Your development environment (Mac Studio) uses ARM64 architecture while most VPS services use x86_64/AMD64 architecture. This difference can cause compatibility issues with Docker images.

### Handling Architecture Differences

1. **Always build Docker images on the target server** instead of pushing locally-built images
2. **Do not copy Docker image files** from your Mac to the server
3. **Ensure cross-platform compatibility** in your Dockerfiles:
   - Avoid architecture-specific base images or binaries
   - Use multi-architecture base images (e.g., `node:18` instead of `node:18-arm64`)
   - Check that all installed packages support both ARM64 and x86_64

In this project, the builder container compiles code specifically for ARM64 due to the cross-compilation settings:
```yaml
environment:
  - CROSS_COMPILE=aarch64-linux-gnu-
  - CC=aarch64-linux-gnu-gcc
  - CXX=aarch64-linux-gnu-g++
```

This is intentional for the target platform of the generated plugins and should work correctly when deployed.

## 1. Prepare the VPS

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker if not already installed
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create directories for the application
sudo mkdir -p /var/www/sf2lv2
```

## 2. Configure DNS in CyberPanel

1. Log in to your CyberPanel dashboard
2. Go to "DNS Management" → "Create DNS Zone" (if not already created for islainstruments.com)
3. Add an A record for sf2lv2.islainstruments.com pointing to your server's IP address

## 3. Clone the Repository

```bash
# Clone the repository to your server
cd /var/www/sf2lv2
git clone https://github.com/islainstruments/sf2lv2web.git .
```

## 4. Configure the Application

### Update Production Docker Compose File

Edit the `docker-compose.prod.yml` file to ensure environment variables are correctly set:

```bash
nano docker-compose.prod.yml
```

```yaml
# Important modifications:
# - Set FRONTEND_URL to https://sf2lv2.islainstruments.com
# - Ensure volumes are correctly mapped
```

### Prepare Volume Directories

```bash
# Create necessary directories
mkdir -p temp
chmod 777 temp
```

## 5. Build and Deploy the Application

### Build the Frontend for Production

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies and build
npm install
npm run build

# Move back to root
cd ..
```

### Start the Docker Containers

```bash
# Build and start production services
# Note: Building directly on the server ensures architecture compatibility
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## 6. Configure CyberPanel and LiteSpeed

### Create a Website in CyberPanel

1. Log in to your CyberPanel dashboard
2. Go to "Websites" → "Create Website"
3. Fill in the following information:
   - Domain name: sf2lv2.islainstruments.com
   - Email: your-email@example.com
   - Package: Select an appropriate package
   - PHP version: 8.1 or latest available
4. Click "Create Website"

### Configure Static File Hosting

1. In CyberPanel, go to "Websites" → "List Websites"
2. Click on "Manage" for sf2lv2.islainstruments.com
3. Go to "File Manager"
4. Delete any default files in the public_html directory
5. Upload the contents of your `/var/www/sf2lv2/frontend/dist` directory to public_html

### Configure Proxy for API Requests

1. In CyberPanel, go to "Websites" → "List Websites"
2. Click on "Manage" for sf2lv2.islainstruments.com
3. Go to "Rewrite Rules"
4. Add a new rewrite rule:

```
RewriteEngine On
RewriteRule ^/api/(.*) http://localhost:4001/api/$1 [P,L]
```

5. For advanced configuration, you may need to directly edit the virtual host configuration in LiteSpeed:

```bash
# Access virtual host configuration (path may vary)
sudo nano /usr/local/lsws/conf/vhosts/sf2lv2.islainstruments.com/vhost.conf
```

Add the following proxy configuration:

```
context /api/ {
  type                proxy
  handler             http://localhost:4001
  addDefaultCharset   off
}

rewrite {
  enable              1
  rules               <<<END
  RewriteRule ^/((?!api/).*)$ /$1 [L]
  END
}
```

6. Restart LiteSpeed:

```bash
sudo systemctl restart lsws
```

## 7. SSL Configuration in CyberPanel

1. In CyberPanel, go to "Websites" → "List Websites"
2. Click on "Manage" for sf2lv2.islainstruments.com
3. Go to "SSL" → "Issue SSL"
4. Select "Let's Encrypt" as the SSL provider
5. Ensure the domain is listed correctly
6. Click "Issue" to obtain SSL certificate

## 8. Verify the Deployment

Visit https://sf2lv2.islainstruments.com in your browser to verify that the application is running correctly.

## 9. Maintenance and Updates

### Update the Application

```bash
# Navigate to application directory
cd /var/www/sf2lv2

# Pull latest changes
git pull

# Rebuild frontend if needed
cd frontend
npm install
npm run build
cd ..

# Copy the updated frontend files to CyberPanel's document root
cp -r frontend/dist/* /home/YOUR_USERNAME/public_html/sf2lv2.islainstruments.com/public_html/

# Restart containers
docker compose -f docker-compose.prod.yml down
# Rebuild to ensure architecture compatibility with any changes
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### View Logs

```bash
# View logs from all containers
docker compose -f docker-compose.prod.yml logs

# View logs from a specific container
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs builder

# View LiteSpeed logs
sudo tail -f /usr/local/lsws/logs/error.log
```

### Backup Important Data

```bash
# Backup the uploaded soundfonts and generated plugins
tar -czvf sf2lv2_backup_$(date +%Y%m%d).tar.gz temp/
```

## 10. Troubleshooting

### Container Issues

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check for architecture-related errors
docker compose -f docker-compose.prod.yml logs | grep -i "exec format error"

# If you see architecture errors, ensure you're rebuilding on the server:
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### LiteSpeed Issues

```bash
# Check LiteSpeed is running
sudo systemctl status lsws

# Check LiteSpeed logs
sudo tail -f /usr/local/lsws/logs/error.log
sudo tail -f /usr/local/lsws/logs/access.log
```

### CyberPanel Issues

1. In CyberPanel dashboard, go to "Dashboard" → "Server Status" to check service status
2. Access CyberPanel logs if necessary:

```bash
sudo tail -f /var/log/cyberpanel.log
```

### Permission Issues

```bash
# Fix permissions if needed
sudo chown -R nobody:nobody /home/YOUR_USERNAME/public_html/sf2lv2.islainstruments.com/public_html/
chmod -R 755 /home/YOUR_USERNAME/public_html/sf2lv2.islainstruments.com/public_html/
chmod -R 777 temp
```

## 11. Security Considerations

- Keep your server updated regularly with `sudo apt update && sudo apt upgrade`
- Use CyberPanel's built-in firewall to restrict access to necessary ports
- Keep CyberPanel updated to the latest version
- Use strong passwords for CyberPanel admin and SSH access
- Consider using SSH key authentication only
- Consider implementing ModSecurity rules in LiteSpeed for additional protection
- Regularly check CyberPanel's Security section for recommendations 