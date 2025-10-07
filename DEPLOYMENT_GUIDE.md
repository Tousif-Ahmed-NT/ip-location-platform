# IP-to-Location Platform - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the IP-to-Location Platform, which consists of a React frontend and a Node.js/Express backend with PostgreSQL and Redis dependencies.

## Architecture Summary

The platform implements a **hybrid architecture** that combines authoritative databases, commercial APIs, active measurement, and machine learning fusion to provide precise IP geolocation with transparent accuracy metrics.

### Key Components

1. **Frontend (React + Tailwind CSS)**
   - Responsive user interface with interactive map visualization using Leaflet
   - Confidence indicators and accuracy radius display
   - Lookup history tracking
   - Optional browser geolocation with user consent
   - API key authentication support

2. **Backend (Node.js/Express)**
   - RESTful API endpoints for IP geolocation
   - Multi-source data fusion from MaxMind GeoIP2, ipinfo.io, and active probing
   - Redis caching layer for performance optimization
   - PostgreSQL for persistent storage of geolocation data and events
   - Rate limiting and API key authentication
   - Fraud/VPN detection placeholder
   - CORS support for cross-origin requests

3. **Data Sources**
   - **MaxMind GeoIP2**: Authoritative database for IP geolocation (requires GeoLite2-City.mmdb file)
   - **ipinfo.io**: Commercial API for enhanced geolocation data
   - **Active Probing**: Simulated traceroute and latency triangulation (placeholder for RIPE Atlas integration)
   - **ML Fusion**: Weighted average algorithm (placeholder for production ML model)

## Frontend Deployment

The frontend has been built and is ready for deployment as a static React application.

### Deployed URL
The frontend will be available at the URL provided after you click the "Publish" button in the UI.

### Configuration
The frontend is configured to connect to the backend at `http://localhost:3000` by default. For production deployment, you'll need to update the API endpoint in `src/App.jsx` to point to your deployed backend URL.

## Backend Deployment

The backend requires a Node.js environment with PostgreSQL and Redis services. Here's how to deploy it:

### Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v13 or higher)
3. **Redis** (v6 or higher)
4. **MaxMind GeoLite2-City Database** (optional, but recommended)
   - Download from [MaxMind](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
   - Place the `GeoLite2-City.mmdb` file in `backend/data/`

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
DB_USER=ip_user
DB_HOST=localhost
DB_NAME=ip_to_location
DB_PASSWORD=ip_password
DB_PORT=5432
PORT=3000
REDIS_URL=redis://localhost:6379
API_KEY=your_super_secret_api_key
FRONTEND_URL=http://localhost:5173
IPINFO_TOKEN=YOUR_IPINFO_API_TOKEN
```

### Database Setup

1. Create a PostgreSQL database:
   ```bash
   createdb ip_to_location
   ```

2. Initialize the database schema:
   ```bash
   cd backend
   npm run init-db
   ```

### Running the Backend Locally

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start Redis (if not already running):
   ```bash
   redis-server
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

The backend will be available at `http://localhost:3000`.

### Deploying to Production

For production deployment, consider the following platforms:

#### Option 1: Heroku

1. Install the Heroku CLI and log in
2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```

3. Add PostgreSQL and Redis add-ons:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   heroku addons:create heroku-redis:hobby-dev
   ```

4. Set environment variables:
   ```bash
   heroku config:set API_KEY=your_super_secret_api_key
   heroku config:set IPINFO_TOKEN=YOUR_IPINFO_API_TOKEN
   heroku config:set FRONTEND_URL=https://your-frontend-url.com
   ```

5. Deploy:
   ```bash
   git push heroku main
   ```

6. Initialize the database:
   ```bash
   heroku run npm run init-db
   ```

#### Option 2: AWS (EC2 + RDS + ElastiCache)

1. Launch an EC2 instance (Ubuntu 22.04 recommended)
2. Set up RDS PostgreSQL instance
3. Set up ElastiCache Redis cluster
4. SSH into the EC2 instance and clone the repository
5. Install Node.js and dependencies
6. Configure environment variables
7. Use PM2 to run the backend as a service:
   ```bash
   npm install -g pm2
   pm2 start index.js --name ip-to-location-backend
   pm2 save
   pm2 startup
   ```

#### Option 3: DigitalOcean App Platform

1. Create a new app in DigitalOcean App Platform
2. Connect your GitHub repository
3. Add PostgreSQL and Redis managed databases
4. Configure environment variables in the app settings
5. Deploy

### API Endpoints

Once deployed, the backend exposes the following endpoints:

- `GET /` - Health check endpoint
- `GET /api/v1/ip-lookup/:ipAddress?` - IP geolocation lookup (requires API key if configured)
- `GET /test-db` - Database connection test

### Rate Limiting

The API is rate-limited to 100 requests per 15 minutes per IP address or API key.

### Authentication

API requests to `/api/v1/*` endpoints require an `Authorization` header with the format:
```
Authorization: Bearer your_super_secret_api_key
```

If the `API_KEY` environment variable is not set, authentication is disabled for development purposes.

## Advanced Features

### Active Probing Integration

The current implementation includes a placeholder for active probing. To integrate real active measurement:

1. **RIPE Atlas Integration**: Sign up for a RIPE Atlas account and obtain API credentials
2. **Custom Probing Agents**: Deploy lightweight measurement agents globally (e.g., on AWS Lambda, Cloudflare Workers)
3. **Update `activeProbingService.js`**: Replace the simulated logic with actual traceroute and latency measurement calls

### Machine Learning Model Integration

The current fusion logic uses a simple weighted average. For production:

1. **Data Collection**: Collect historical geolocation data from all sources along with ground truth
2. **Model Training**: Train a regression model (e.g., using scikit-learn, TensorFlow) to predict optimal weights
3. **Model Deployment**: Deploy the ML model as a microservice (Python Flask/FastAPI) or integrate via gRPC
4. **Update `geolocationService.js`**: Replace the weighted average with ML model predictions

### Fraud/VPN Detection

To implement comprehensive fraud detection:

1. **Cloud ASN Lists**: Integrate with services like IPQualityScore, IPHub, or maintain your own ASN database
2. **Known Proxy/VPN Databases**: Subscribe to commercial databases or use open-source lists
3. **Update `fraudDetection` middleware**: Add actual detection logic in `index.js`

### Kafka/RabbitMQ Integration

For asynchronous task processing (e.g., database refresh, bulk lookups):

1. Set up a Kafka or RabbitMQ cluster
2. Create producers in the backend to publish events
3. Create consumers to process events asynchronously
4. Use cases: periodic MaxMind database updates, batch geolocation processing, webhook notifications

## Monitoring and Logging

For production deployments, implement:

1. **Application Monitoring**: Use services like New Relic, Datadog, or Prometheus
2. **Error Tracking**: Integrate Sentry or Rollbar
3. **Log Aggregation**: Use ELK stack (Elasticsearch, Logstash, Kibana) or cloud-native solutions
4. **Performance Metrics**: Track API response times, cache hit rates, database query performance

## Security Considerations

1. **HTTPS**: Always use HTTPS in production for both frontend and backend
2. **API Key Rotation**: Implement a system for rotating API keys periodically
3. **Database Security**: Use strong passwords, enable SSL connections, restrict network access
4. **Redis Security**: Enable authentication, use SSL/TLS, restrict network access
5. **GDPR Compliance**: Implement data retention policies, user consent mechanisms, and data deletion capabilities
6. **Input Validation**: Validate all IP addresses and user inputs to prevent injection attacks

## Troubleshooting

### Frontend Issues

- **API Connection Errors**: Ensure the backend URL in `App.jsx` matches your deployed backend
- **CORS Errors**: Verify that the backend's `FRONTEND_URL` environment variable matches your frontend URL
- **Map Not Displaying**: Check browser console for Leaflet errors, ensure CSS is loaded

### Backend Issues

- **Database Connection Errors**: Verify PostgreSQL is running and credentials are correct
- **Redis Connection Errors**: Verify Redis is running and the `REDIS_URL` is correct
- **MaxMind Errors**: Ensure the GeoLite2-City.mmdb file exists in `backend/data/`
- **Rate Limiting Issues**: Adjust the rate limit settings in `index.js` if needed

## Cost Considerations

- **MaxMind GeoLite2**: Free (with attribution)
- **ipinfo.io**: Free tier available (50,000 requests/month), paid plans for higher volumes
- **PostgreSQL**: Free (self-hosted) or $7-50/month (managed services)
- **Redis**: Free (self-hosted) or $10-30/month (managed services)
- **Hosting**: $5-50/month depending on traffic and provider

## Next Steps

1. **Obtain API Credentials**: Sign up for ipinfo.io and download MaxMind GeoLite2 database
2. **Deploy Backend**: Choose a deployment platform and follow the instructions above
3. **Update Frontend**: Update the API endpoint in the frontend to point to your deployed backend
4. **Test**: Thoroughly test all features in the production environment
5. **Monitor**: Set up monitoring and logging to track performance and errors
6. **Iterate**: Continuously improve the ML model, add more data sources, and enhance features

## Support

For issues or questions about the platform, refer to the main README.md file or the inline code comments for implementation details.
