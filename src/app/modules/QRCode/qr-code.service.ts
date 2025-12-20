import AppError from "@middleware/AppError";
import { Prisma } from "@prisma/client";
import prisma from "@utils/prisma";
import dayjs from "dayjs";
import { Request } from "express";
import { StatusCodes } from "http-status-codes";

// CREATE QR CODE
const createQRCode = async (req: Request) => {
  const createdQRCodeData = await prisma.qRCode.create({
    data: req.body,
  });

  return createdQRCodeData;
};

// DELETE QR CODE
const deleteQRCode = async (id: string) => {
  if (!id) {
    throw new AppError(StatusCodes.BAD_REQUEST, "QR Code ID is required for deletion");
  }

  // Check if QR code exists before deletion (optional but recommended)
  const existingQRCode = await prisma.qRCode.findUnique({
    where: { id },
  });

  if (!existingQRCode) {
    throw new AppError(StatusCodes.NOT_FOUND, "QR Code not found");
  }

  // Delete the QR Code
  await prisma.qRCode.delete({
    where: { id },
  });

  return null;
};


// UPDATE QR CODE
const updateQRCode = async (id: string, data: any) => {
  if (!id) {
    throw new AppError(StatusCodes.OK, "QR Code ID is required for updating");
  }
  //  TODO : need to add schema validation 
  // TODO: need to update total edit count 
  console.log("qr update data", data)
  const updatedQRCodeData = await prisma.qRCode.update({
    where: { id },
    data,
  });

  return updatedQRCodeData;
};

// TRACK SCAN SERVICE
const trackScan = async (
  qrId: string,
  fingerprint: string,
  userAgent: string,
  ip: string,
  location: any,
  deviceType: string,
  os: string,
  browser: string,
  lat?: number,
  lon?: number
) => {


  if (!qrId || !fingerprint) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Missing QR ID or fingerprint");
  }

  const existingScan = await prisma.scan.findFirst({
    where: { qrId, fingerprint },
  });

  const isUnique = !existingScan;

  // Prepare update data for QRCode
  const qrCodeUpdateData: any = {
    totalScans: { increment: 1 },
    lastScans: new Date(),
  };

  if (isUnique) {
    qrCodeUpdateData.uniqueScans = { increment: 1 };
  }

  // Use transaction to ensure consistency
  const [scan] = await prisma.$transaction([
    prisma.scan.create({
      data: {
        qrId,
        fingerprint,
        userAgent,
        ip,
        country: location.country || null,
        region: location.region || null,
        city: location.city || null,
        latitude: lat || location.latitude || null,
        longitude: lon || location.longitude || null,
        deviceType,
        os,
        browser,
        isUnique,
      },
    }),

    prisma.qRCode.update({
      where: { id: qrId },
      data: qrCodeUpdateData,
    }),
  ]);

  return { scan, isUnique };
};

// ✅ GET ALL QR CODES
const getAllQRCodes = async (creatorId?: string) => {
  console.log("Creator Id", creatorId)
  const filter: Prisma.QRCodeFindManyArgs = creatorId


    ? {
      where: { creatorId },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    }
    : {
      orderBy: { createdAt: Prisma.SortOrder.desc },
    };

  const qrCodes = await prisma.qRCode.findMany(filter);
  return qrCodes;
};

const getSingleQRData = async (qrCodeId: string) => {
  // Get QR Code metadata
  const qrCode = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
  });

  // Get all scans for processing
  const allScans = await prisma.scan.findMany({
    where: { qrId: qrCodeId },
    select: {
      timestamp: true,
      deviceType: true,
      region: true,
      city: true,
      country: true,
    },
  });

  // Scan count by day
  const scanActivityMap: Record<string, number> = {};
  allScans.forEach(scan => {
    const date = dayjs(scan.timestamp).format("YYYY-MM-DD");
    scanActivityMap[date] = (scanActivityMap[date] || 0) + 1;
  });
  const scanActivity = Array.from({ length: 30 }).map((_, i) => {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    return {
      date,
      scans: scanActivityMap[date] || 0,
    };
  }).reverse();

  // Scan count by hour
  const hourlyMap: Record<string, number> = {};
  allScans.forEach(scan => {
    const hour = dayjs(scan.timestamp).hour();
    const label = `${hour.toString().padStart(2, "0")}:00`;
    hourlyMap[label] = (hourlyMap[label] || 0) + 1;
  });
  const scansOverTime = Array.from({ length: 24 }).map((_, i) => {
    const label = `${i.toString().padStart(2, "0")}:00`;
    return {
      hour: label,
      scans: hourlyMap[label] || 0,
    };
  });

  // Group by device
  const deviceMap: Record<string, number> = {};
  allScans.forEach(scan => {
    const device = scan.deviceType || "Unknown";
    deviceMap[device] = (deviceMap[device] || 0) + 1;
  });
  const totalDeviceScans = allScans.length;
  const scanByDevice = Object.entries(deviceMap).map(([device, count]) => ({
    device,
    count,
    percentage: Math.round((count / totalDeviceScans) * 100),
  }));

  // Group by region
  const regionMap: Record<string, number> = {};
  allScans.forEach(scan => {
    const region = scan.region || "Unknown";
    regionMap[region] = (regionMap[region] || 0) + 1;
  });
  const totalRegionScans = allScans.length;
  const scanByLocation = Object.entries(regionMap).map(([region, count]) => ({
    country: region,
    count,
    percentage: Math.round((count / totalRegionScans) * 100),
  }));

  // Recent Scans
  const recentScansRaw = await prisma.scan.findMany({
    where: { qrId: qrCodeId },
    take: 5,
    orderBy: { timestamp: "desc" },
    select: {
      id: true,
      city: true,
      region: true,
      country: true,
      deviceType: true,
      timestamp: true,
    },
  });
  const recentScans = recentScansRaw.map(scan => ({
    id: scan.id,
    location: scan.region || "Unknown",
    device: scan.deviceType || "Unknown",
    timestamp: scan.timestamp,
  }));

  return {
    qrCode,
    totalScans: allScans.length,
    scanActivity,
    scansOverTime,
    scanByDevice,
    scanByLocation,
    recentScans,
  };
};
const getQRCodeScanSettings = async (qrCodeId: string) => {
  const qrCode = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
    select: {
      id: true,
      targetUrl: true,
    },
  });

  return {
    qrCode,
  };
};

const getDashboardStats = async (creatorId?: string) => {
  const userId = creatorId;
  const today = dayjs();
  const lastWeek = today.subtract(7, 'day');
  const lastMonth = today.subtract(1, 'month');
  const thirtyDaysAgo = today.subtract(30, 'day');
  // Total QR Codes
  const totalQRCodes = await prisma.qRCode.count({ where: { creatorId: userId } });
  const lastWeekQRCodes = await prisma.qRCode.count({
    where: { creatorId: userId, createdAt: { gte: lastWeek.toDate() } },
  });


  // Total Scans & Unique Visitors
  const totalScans = await prisma.scan.count({
    where: { qrCode: { creatorId: userId } },
  });
  const lastMonthScans = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      timestamp: { gte: lastMonth.toDate() },
    },
  });
  const uniqueVisitors = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      isUnique: true,
    },
  });
  const lastMonthUnique = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      isUnique: true,
      timestamp: { gte: lastMonth.toDate() },
    },
  });

  // Scans in last 7 days
  const scansLast7Days = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      timestamp: { gte: lastWeek.toDate() },
    },
  });
  const scansPrevious7Days = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      timestamp: {
        gte: today.subtract(14, 'day').toDate(),
        lt: lastWeek.toDate(),
      },
    },
  });


  // Fetch all scans in the last 30 days
  const scanActivityRaw = await prisma.scan.findMany({
    where: {
      qrCode: { creatorId: userId },
      timestamp: { gte: thirtyDaysAgo.toDate() },
    },
    select: { timestamp: true },
  });

  // Group in JS by day
  const scanActivityMap: Record<string, number> = {};

  scanActivityRaw.forEach(scan => {
    const date = dayjs(scan.timestamp).format('YYYY-MM-DD');
    scanActivityMap[date] = (scanActivityMap[date] || 0) + 1;
  });

  // Prepare the last 30 days
  const scanActivity = Array.from({ length: 30 }).map((_, i) => {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    return {
      date,
      scans: scanActivityMap[date] || 0,
    };
  }).reverse();


  // Recent Scans
  const recentScans = await prisma.scan.findMany({
    where: { qrCode: { creatorId: userId } },
    take: 3,
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      region: true,
      deviceType: true,
      timestamp: true,
    },
  });


  // Top QR Codes
  const topQRCodes = await prisma.qRCode.findMany({
    where: { creatorId: userId },
    orderBy: { totalScans: 'desc' },
    take: 5,
    select: { id: true, name: true, totalScans: true },
  });

  // Scan by Device
  const deviceData = await prisma.scan.groupBy({
    by: ['deviceType'],
    where: { qrCode: { creatorId: userId } },
    _count: true,
  });
  const totalDeviceScans = deviceData.reduce((sum, d) => sum + d._count, 0);
  const scanByDevice = deviceData.map(d => ({
    device: d.deviceType || 'Unknown',
    count: d._count,
    percentage: Math.round((d._count / totalDeviceScans) * 100),
  }));

  // Scan by Location
  const locationData = await prisma.scan.groupBy({
    by: ['region'],
    where: { qrCode: { creatorId: userId } },
    _count: true,
  });
  const totalLocationScans = locationData.reduce((sum, d) => sum + d._count, 0);
  const scanByLocation = locationData.map(loc => ({
    country: loc.region || 'Unknown',
    count: loc._count,
    percentage: Math.round((loc._count / totalLocationScans) * 100),
  }));

  return {
    totalQRCodes: {
      count: totalQRCodes,
      diff: totalQRCodes - lastWeekQRCodes,
    },
    totalScans: {
      count: totalScans,
      diffPercentage: totalScans
        ? Math.round((lastMonthScans / totalScans) * 100)
        : 0,
    },
    uniqueVisitors: {
      count: uniqueVisitors,
      diffPercentage: uniqueVisitors
        ? Math.round((lastMonthUnique / uniqueVisitors) * 100)
        : 0,
    },
    scansLast7Days: {
      count: scansLast7Days,
      diffPercentage: scansPrevious7Days
        ? Math.round(((scansLast7Days - scansPrevious7Days) / scansPrevious7Days) * 100)
        : 0,
    },
    scanActivity,
    recentScans: recentScans.map(scan => ({
      id: scan.id,
      location: scan.region || 'Unknown',
      device: scan.deviceType || 'Unknown',
      timestamp: scan.timestamp,
    })),
    topQRCodes,
    scanByDevice,
    scanByLocation,
  }
}
const getDashboardAnalytics = async (creatorId?: string) => {
  const userId = creatorId;
  const today = dayjs();
  const lastWeek = today.subtract(7, 'day');
  const lastMonth = today.subtract(1, 'month');
  const thirtyDaysAgo = today.subtract(30, 'day');
  // Total QR Codes
  const totalQRCodes = await prisma.qRCode.count({ where: { creatorId: userId } });
  const lastWeekQRCodes = await prisma.qRCode.count({
    where: { creatorId: userId, createdAt: { gte: lastWeek.toDate() } },
  });


  // Total Scans & Unique Visitors
  const totalScans = await prisma.scan.count({
    where: { qrCode: { creatorId: userId } },
  });
  const lastMonthScans = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      timestamp: { gte: lastMonth.toDate() },
    },
  });
  const uniqueVisitors = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      isUnique: true,
    },
  });
  const lastMonthUnique = await prisma.scan.count({
    where: {
      qrCode: { creatorId: userId },
      isUnique: true,
      timestamp: { gte: lastMonth.toDate() },
    },
  });


  // Fetch all scans in the last 30 days
  const scanActivityRaw = await prisma.scan.findMany({
    where: {
      qrCode: { creatorId: userId },
      timestamp: { gte: thirtyDaysAgo.toDate() },
    },
    select: { timestamp: true },
  });

  // Group in JS by day
  const scanActivityMap: Record<string, number> = {};

  scanActivityRaw.forEach(scan => {
    const date = dayjs(scan.timestamp).format('YYYY-MM-DD');
    scanActivityMap[date] = (scanActivityMap[date] || 0) + 1;
  });

  // Prepare the last 30 days
  const scanActivity = Array.from({ length: 30 }).map((_, i) => {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    return {
      date,
      scans: scanActivityMap[date] || 0,
    };
  }).reverse();


  // Top QR Codes
  const topQRCodes = await prisma.qRCode.findMany({
    where: { creatorId: userId },
    orderBy: { totalScans: 'desc' },
    take: 5,
    select: { id: true, name: true, totalScans: true },
  });

  // Scan by Device
  const deviceData = await prisma.scan.groupBy({
    by: ['deviceType'],
    where: { qrCode: { creatorId: userId } },
    _count: true,
  });
  const totalDeviceScans = deviceData.reduce((sum, d) => sum + d._count, 0);
  const scanByDevice = deviceData.map(d => ({
    device: d.deviceType || 'Unknown',
    count: d._count,
    percentage: Math.round((d._count / totalDeviceScans) * 100),
  }));

  // Scan by Location
  const locationData = await prisma.scan.groupBy({
    by: ['region'],
    where: { qrCode: { creatorId: userId } },
    _count: true,
  });
  const totalLocationScans = locationData.reduce((sum, d) => sum + d._count, 0);
  const scanByLocation = locationData.map(loc => ({
    country: loc.region || 'Unknown',
    count: loc._count,
    percentage: Math.round((loc._count / totalLocationScans) * 100),
  }));




  // Top Countries
  const countryData = await prisma.scan.groupBy({
    by: ['country'],
    where: { qrCode: { creatorId: userId } },
    _count: { country: true },
    orderBy: {
      _count: {
        country: 'desc',
      },
    },
    take: 10,
  });
  const totalCountryScans = countryData.reduce((sum, c) => sum + c._count.country, 0);

  const topCountries = countryData.map(c => ({
    country: c.country || 'Unknown',
    count: c._count.country,
    percentage: totalCountryScans
      ? Math.round((c._count.country / totalCountryScans) * 100)
      : 0,
  }));


  // Top Cities
  const cityData = await prisma.scan.groupBy({
    by: ['city'],
    where: { qrCode: { creatorId: userId } },
    _count: { city: true },
    orderBy: {
      _count: {
        city: 'desc',
      },
    },
    take: 10,
  });

  const totalCityScans = cityData.reduce((sum, c) => sum + c._count.city, 0);

  const topCities = cityData.map(c => ({
    city: c.city || 'Unknown',
    count: c._count.city,
    percentage: totalCityScans
      ? Math.round((c._count.city / totalCityScans) * 100)
      : 0,
  }));

  // Browser Distribution
  const browserData = await prisma.scan.groupBy({
    by: ['browser'],
    where: { qrCode: { creatorId: userId } },
    _count: { browser: true },
    orderBy: {
      _count: {
        browser: 'desc',
      },
    },
  });

  const browserDistribution = browserData.map(b => ({
    browser: b.browser || 'Unknown',
    count: b._count.browser,
  }));


  // Recent Scans
  const recentScans = await prisma.scan.findMany({
    where: { qrCode: { creatorId: userId } },
    take: 3,
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      region: true,
      deviceType: true,
      timestamp: true,
    },
  });



  const scanByHour: Record<string, number> = {};
  recentScans.forEach(scan => {
    const hour = dayjs(scan.timestamp).hour();
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
    scanByHour[hourLabel] = (scanByHour[hourLabel] || 0) + 1;
  });

  const scansOverTime = Array.from({ length: 24 }).map((_, i) => {
    const hour = dayjs().subtract(23 - i, 'hour').hour();
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
    return {
      hour: hourLabel,
      scans: scanByHour[hourLabel] || 0,
    };
  });

  const last24HrScans = {
    count: scansOverTime.reduce((sum, entry) => sum + entry.scans, 0),
    diffPercentage: totalScans
      ? Math.round((scansOverTime.reduce((sum, entry) => sum + entry.scans, 0) / totalScans) * 100)
      : 0,
  }


  return {
    topCountries,
    topCities,
    browserDistribution,
    scansOverTime,
    last24HrScans,
    totalQRCodes: {
      count: totalQRCodes,
      diff: totalQRCodes - lastWeekQRCodes,
    },
    totalScans: {
      count: totalScans,
      diffPercentage: totalScans
        ? Math.round((lastMonthScans / totalScans) * 100)
        : 0,
    },
    uniqueVisitors: {
      count: uniqueVisitors,
      diffPercentage: uniqueVisitors
        ? Math.round((lastMonthUnique / uniqueVisitors) * 100)
        : 0,
    },

    scanActivity,
    recentScans: recentScans.map(scan => ({
      id: scan.id,
      location: scan.region || 'Unknown',
      device: scan.deviceType || 'Unknown',
      timestamp: scan.timestamp,
    })),
    topQRCodes,
    scanByDevice,
    scanByLocation,
  }
}

export const QRCodeService = {
  createQRCode,
  updateQRCode,
  trackScan,
  getAllQRCodes,
  getSingleQRData,
  deleteQRCode,
  getDashboardStats,
  getDashboardAnalytics,
  getQRCodeScanSettings
};