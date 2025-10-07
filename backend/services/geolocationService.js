const db = require("../lib/db");
const maxmind = require("maxmind");
const IPinfoWrapper = require("node-ipinfo").default;
const { performActiveProbe } = require("./activeProbingService");
const redisClient = require("../lib/redisClient");

// Initialize MaxMind (assuming a .mmdb file is available locally)
let geoIpLookup;
async function initializeMaxMind() {
  try {
    // You would need to download GeoLite2-City.mmdb from MaxMind and place it in a known location
    // For example: path.join(__dirname, "../data/GeoLite2-City.mmdb")
    geoIpLookup = await maxmind.open("./data/GeoLite2-City.mmdb");
    console.log("MaxMind GeoLite2-City database loaded.");
  } catch (error) {
    console.warn("MaxMind database not found or failed to load. MaxMind lookups will be skipped.", error.message);
  }
}
initializeMaxMind();

// Initialize IPinfo (requires an API token)
const ipinfoToken = process.env.IPINFO_TOKEN;
const ipinfo = ipinfoToken ? new IPinfoWrapper(ipinfoToken) : null;
if (!ipinfoToken) {
  console.warn("IPINFO_TOKEN not set. ipinfo lookups will be skipped.");
}

async function getGeolocation(ipAddress) {
  const cacheKey = `ip_geolocation:${ipAddress}`;

  // 1. Try Redis cache first
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Found IP ${ipAddress} in Redis cache.`);
      return { ...JSON.parse(cachedData), source: `cached_${JSON.parse(cachedData).source}` };
    }
  } catch (error) {
    console.error("Error querying Redis cache:", error);
  }

  let allLocationData = [];

  // 2. Try local database
  try {
    const { rows } = await db.query(
      "SELECT latitude, longitude, accuracy_radius, confidence_score, source FROM ip_locations WHERE ip_address = $1",
      [ipAddress]
    );
    if (rows.length > 0) {
      console.log(`Found IP ${ipAddress} in local DB.`);
      // If a highly confident result is in DB, return it directly for performance
      if (rows[0].confidence_score >= 95) {
        await redisClient.set(cacheKey, JSON.stringify(rows[0]), { EX: 3600 }); // Cache for 1 hour
        return { ...rows[0], source: `cached_${rows[0].source}` };
      }
      allLocationData.push({ ...rows[0], weight: 0.9 }); // Give local DB a high weight
    }
  } catch (error) {
    console.error("Error querying local DB for geolocation:", error);
  }

  // 3. MaxMind GeoIP2 lookup
  if (geoIpLookup) {
    try {
      const maxmindResult = geoIpLookup.get(ipAddress);
      if (maxmindResult && maxmindResult.location) {
        allLocationData.push({
          latitude: maxmindResult.location.latitude,
          longitude: maxmindResult.location.longitude,
          accuracy_radius: maxmindResult.location.accuracy_radius || 5000,
          confidence_score: 70.00,
          source: "MaxMind",
          weight: 0.7,
        });
        console.log(`MaxMind lookup for ${ipAddress} successful.`);
      }
    } catch (error) {
      console.error("Error during MaxMind lookup:", error);
    }
  }

  // 4. ipinfo.io API lookup
  if (ipinfo) {
    try {
      const ipinfoResult = await ipinfo.lookupIp(ipAddress);
      if (ipinfoResult && ipinfoResult.loc) {
        const [latitude, longitude] = ipinfoResult.loc.split(",").map(Number);
        allLocationData.push({
          latitude,
          longitude,
          accuracy_radius: 5000, // ipinfo doesn't provide accuracy_radius directly, assign default
          confidence_score: 80.00,
          source: "ipinfo",
          weight: 0.8,
        });
        console.log(`ipinfo lookup for ${ipAddress} successful.`);
      }
    } catch (error) {
      console.error("Error during ipinfo lookup:", error);
    }
  }

  // 5. Active Probing (if no high confidence data yet or to refine)
  const needsActiveProbe = allLocationData.every(data => data.confidence_score < 90);
  if (needsActiveProbe) {
    try {
      const probeResult = await performActiveProbe(ipAddress);
      allLocationData.push({ ...probeResult, weight: 0.95 }); // Active probe is highly weighted
      console.log(`Active probe for ${ipAddress} successful.`);
    } catch (error) {
      console.error("Error during active probing:", error);
    }
  }

  // 6. ML Model for Fusion Logic
  // The prompt specifies an ML model that weights sources to output a latitude/longitude + accuracy radius and a confidence score.
  // For this implementation, a simple weighted average is used as a placeholder.
  // In a production environment, this would involve training a machine learning model (e.g., a regression model) on historical data
  // from various sources, active probes, and ground truth to predict the most accurate location and confidence.
  // The ML model could be exposed via an internal gRPC service or a dedicated API endpoint.
  // The weights assigned to each source (e.g., `data.weight`) would ideally be learned by this ML model.
  // For example, a Python microservice using scikit-learn or TensorFlow could be integrated here.
  // This current implementation serves as a basic fusion mechanism.
  let totalWeight = 0;
  let weightedLatitudeSum = 0;
  let weightedLongitudeSum = 0;
  let weightedAccuracySum = 0;
  let weightedConfidenceSum = 0;
  let bestSource = "";
  let highestConfidence = 0;

  allLocationData.forEach(data => {
    if (data.latitude && data.longitude && data.confidence_score) {
      const weight = data.weight || 1.0; // Default weight if not specified
      weightedLatitudeSum += data.latitude * weight;
      weightedLongitudeSum += data.longitude * weight;
      weightedAccuracySum += (data.accuracy_radius || 5000) * weight;
      weightedConfidenceSum += data.confidence_score * weight;
      totalWeight += weight;

      if (data.confidence_score > highestConfidence) {
        highestConfidence = data.confidence_score;
        bestSource = data.source;
      }
    }
  });

  let finalLocation;
  if (totalWeight > 0) {
    finalLocation = {
      latitude: weightedLatitudeSum / totalWeight,
      longitude: weightedLongitudeSum / totalWeight,
      accuracy_radius: Math.round(weightedAccuracySum / totalWeight),
      confidence_score: parseFloat((weightedConfidenceSum / totalWeight).toFixed(2)),
      source: `fused_from_${bestSource}`,
    };
  } else {
    // Fallback if no data is found from any source
    finalLocation = {
      latitude: 0,
      longitude: 0,
      accuracy_radius: 40000000, // World radius
      confidence_score: 0.00,
      source: "fallback",
    };
  }

  // Store the fused result in the local database for future use
  try {
    await db.query(
      "INSERT INTO ip_locations (ip_address, latitude, longitude, accuracy_radius, confidence_score, source) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (ip_address) DO UPDATE SET latitude = $2, longitude = $3, accuracy_radius = $4, confidence_score = $5, source = $6, last_updated = CURRENT_TIMESTAMP",
      [ipAddress, finalLocation.latitude, finalLocation.longitude, finalLocation.accuracy_radius, finalLocation.confidence_score, finalLocation.source]
    );
    console.log(`Fused location for ${ipAddress} stored in local DB.`);
    await redisClient.set(cacheKey, JSON.stringify(finalLocation), { EX: 3600 }); // Cache for 1 hour
  } catch (error) {
    console.error("Error storing fused location in local DB or Redis:", error);
  }

  return finalLocation;
}

module.exports = { getGeolocation };

