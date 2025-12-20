const getGeoLocation = async (ip: string) => {
  try {
    // If it's a local IP, don't try to geolocate it
    const isLocal = ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1') || ip.includes('localhost');
    // If it's local, use a real IP for testing so location isn't "Unknown"
    const lookupIp = isLocal ? '8.8.8.8' : ip;

    const res = await fetch(`http://ip-api.com/json/${lookupIp}`);
    const data = await res.json();

    return {
      country: data?.country || "Earth",
      region: data?.regionName || "Universal",
      city: data?.city || "Cyber Space",
      latitude: data?.lat || null,
      longitude: data?.lon || null,
    };
  } catch (error) {
    return {
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }
};

export default getGeoLocation;