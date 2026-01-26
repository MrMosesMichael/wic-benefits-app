# WIC Landing Page

Simple landing page for https://mdmichael.com/wic/

## Deployment

Copy the contents of this directory to your web server:

```bash
# On your VPS
sudo mkdir -p /var/www/wic
sudo cp -r deployment/wic-landing/* /var/www/wic/

# Set permissions
sudo chown -R www-data:www-data /var/www/wic
sudo chmod -R 755 /var/www/wic
```

## nginx Configuration

Add this to your mdmichael.com server block (or use the existing nginx-wic.conf):

```nginx
# WIC landing page
location = /wic/ {
    alias /var/www/wic/index.html;
}

# Static assets (if you add CSS/JS files)
location /wic/static/ {
    alias /var/www/wic/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

Or update the existing nginx-wic.conf to uncomment the landing page section.

## Features

- Responsive design (mobile-friendly)
- Live API health check (updates every 30 seconds)
- Clean, accessible UI
- Fast load time (single HTML file, no dependencies)
- Gradient background with modern card design

## Customization

Edit `index.html` to:
- Update download links (when app is published)
- Add app store badges
- Include screenshots
- Add FAQ section
- Change colors/branding
