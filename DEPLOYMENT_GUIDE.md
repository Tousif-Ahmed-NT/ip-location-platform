# IP-to-Location Platform - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the IP-to-Location Platform, which consists of a React frontend and a Node.js/Express backend with PostgreSQL and Redis dependencies. This guide focuses on **free-tier deployment options** to get your application live without incurring costs.

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

## Frontend Deployment (Recommended: Vercel)

**Vercel** offers a generous free tier and seamless integration with GitHub for deploying React applications.

### Steps to Deploy Frontend to Vercel

1.  **Create a Vercel Account:** Go to [vercel.com](https://vercel.com/) and sign up using your GitHub account. This simplifies the connection process.
2.  **Import Project:** On your Vercel dashboard, click "Add New..." -> "Project".
3.  **Connect GitHub Repository:** Vercel will ask to connect to your GitHub account. Grant it access to your `ip-location-platform` repository.
4.  **Configure Project:**
    *   Vercel should automatically detect that it's a React project built with Vite.
    *   When prompted for the **Root Directory**, specify `frontend/app`. This tells Vercel where your React application code resides within your monorepo.
    *   Leave other settings (Build Command, Output Directory) as default unless you have custom configurations.
5.  **Deploy:** Click "Deploy". Vercel will build your React app and provide you with a live URL (e.g., `https://your-project-name.vercel.app`). Make a note of this URL.

### Configuration after Deployment

*   The frontend is initially configured to connect to the backend at `http://localhost:3000`. Once your backend is deployed (see next section), you **MUST** update the API endpoint in `frontend/app/src/App.jsx` to point to your deployed backend URL. You can do this by editing the file directly on GitHub, and Vercel will automatically redeploy.

## Backend Deployment (Recommended: Render)

**Render** provides a free tier for web services, PostgreSQL databases, and Redis caches, making it an excellent choice for deploying your full-stack backend.

### Prerequisites for Backend Deployment

1.  **Node.js** (v18 or higher)
2.  **PostgreSQL** (v13 or higher)
3.  **Redis** (v6 or higher)
4.  **MaxMind GeoLite2-City Database** (optional, but recommended)
    *   Download from [MaxMind](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
    *   You will need to upload this `.mmdb` file to your Render service after deployment, or configure a persistent volume if Render supports it for free tiers.

### Steps to Deploy Backend to Render

1.  **Create a Render Account:** Go to [render.com](https://render.com/) and sign up using your GitHub account.
2.  **Create a New Web Service:**
    *   On your Render dashboard, click "New" -> "Web Service".
    *   Connect your GitHub repository `ip-location-platform`.
    *   **Root Directory:** Specify `backend`.
    *   **Name:** Choose a name for your backend service (e.g., `ip-location-backend`).
    *   **Environment:** Node.
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
    *   **Instance Type:** Select "Free".
    *   Click "Create Web Service".
3.  **Create a PostgreSQL Database:**
    *   On your Render dashboard, click "New" -> "PostgreSQL".
    *   **Name:** Choose a name (e.g., `ip-location-db`).
    *   **Region:** Select a region close to your web service.
    *   **Instance Type:** Select "Free".
    *   Click "Create Database".
    *   Once created, navigate to its "Info" page and copy the **Internal Database URL** and **External Database URL**. You will need these.
4.  **Create a Redis Instance:**
    *   On your Render dashboard, click "New" -> "Redis".
    *   **Name:** Choose a name (e.g., `ip-location-redis`).
    *   **Region:** Select a region close to your web service.
    *   **Instance Type:** Select "Free".
    *   Click "Create Redis".
    *   Once created, navigate to its "Info" page and copy the **Internal Redis URL** and **External Redis URL**. You will need these.
5.  **Configure Environment Variables for Web Service:**
    *   Go back to your `ip-location-backend` web service settings.
    *   Navigate to the "Environment" section.
    *   Add the following environment variables:
        *   `DB_USER`: (from your Render PostgreSQL info)
        *   `DB_HOST`: (from your Render PostgreSQL info - use the **Internal Database URL** hostname)
        *   `DB_NAME`: (from your Render PostgreSQL info)
        *   `DB_PASSWORD`: (from your Render PostgreSQL info)
        *   `DB_PORT`: `5432` (default for PostgreSQL)
        *   `REDIS_URL`: (from your Render Redis info - use the **Internal Redis URL**)
        *   `API_KEY`: `your_super_secret_api_key` (Choose a strong, unique key)
        *   `IPINFO_TOKEN`: `YOUR_IPINFO_API_TOKEN` (Obtain from [ipinfo.io](https://ipinfo.io/developers))
        *   `FRONTEND_URL`: `https://your-vercel-frontend-url.vercel.app` (The URL you got from Vercel)
        *   `PORT`: `10000` (Render requires services to listen on this port)
    *   **Important:** Ensure your `backend/index.js` listens on `process.env.PORT`.
6.  **Initialize the Database Schema:**
    *   After your web service is deployed and connected to the database, you need to run the `init_db.js` script.
    *   In your Render dashboard, go to your `ip-location-backend` web service.
    *   Click on the "Shell" tab.
    *   Run the command: `node init_db.js`
7.  **Update Frontend to use Backend URL:** Once your backend is deployed and running on Render, it will have a public URL (e.g., `https://ip-location-backend.onrender.com`). You **MUST** update the `fetch` call in your frontend's `frontend/app/src/App.jsx` to use this URL instead of `http://localhost:3000`.

### Running the Backend Locally (for development)

1.  **Prerequisites:** Install PostgreSQL and Redis locally on your machine.
2.  **Environment Variables:** Create a `.env` file in the `backend` directory with the following variables:
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
3.  **Database Setup:**
    *   Create a PostgreSQL database: `createdb ip_to_location`
    *   Initialize the database schema: `cd backend && npm run init-db`
4.  **Install dependencies:** `cd backend && npm install`
5.  **Start Redis** (if not already running): `redis-server`
6.  **Start the backend server:** `npm start`

The backend will be available at `http://localhost:3000`.

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
- **Vercel**: Generous free tier for frontend
- **Render**: Generous free tier for web services, PostgreSQL, and Redis

## Next Steps

1. **Obtain API Credentials**: Sign up for ipinfo.io and download MaxMind GeoLite2 database
2. **Deploy Frontend**: Follow the Vercel deployment steps above.
3. **Deploy Backend**: Follow the Render deployment steps above.
4. **Update Frontend**: Update the API endpoint in the frontend to point to your deployed backend URL.
5. **Test**: Thoroughly test all features in the production environment
6. **Monitor**: Set up monitoring and logging to track performance and errors
7. **Iterate**: Continuously improve the ML model, add more data sources, and enhance features

## Support

For issues or questions about the platform, refer to the main README.md file or the inline code comments for implementation details.
