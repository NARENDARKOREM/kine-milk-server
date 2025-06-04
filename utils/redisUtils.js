
async function storeRiderLocation(redisClient,riderId,latitude,longitude){
    const locationData={latitude,longitude,timeStamp:Date.now()}
    await redisClient.setEx(`rider:${riderId}:location`, 3600, JSON.stringify(locationData))
}

async function getRiderLocation(redisClient,riderId) {
    const data=await redisClient.get(`rider:${riderId}:location`)
    return data ? JSON.parse(data) : null;
}

module.exports = { storeRiderLocation, getRiderLocation };