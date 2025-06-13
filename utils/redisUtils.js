async function storeRiderLocation(redisClient, riderId, latitude, longitude) {
  const locationData = { latitude, longitude, timeStamp: Date.now() };

  // Upstash-compatible: use 'set' with 'EX'
  await redisClient.set(
    `rider:${riderId}:location`,
    JSON.stringify(locationData),
    'EX',
    3600 // 1 hour expiry
  );
}

async function getRiderLocation(redisClient, riderId) {
  const data = await redisClient.get(`rider:${riderId}:location`);
  return data ? JSON.parse(data) : null;
}

module.exports = { storeRiderLocation, getRiderLocation };
