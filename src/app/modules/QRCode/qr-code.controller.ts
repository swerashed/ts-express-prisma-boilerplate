import CatchAsync from "@utils/CatchAsync";
import SendResponse from "@utils/SendResponse";
import { StatusCodes } from "http-status-codes";
import { QRCodeService } from "./qr-code.service";
import getGeoLocation from "@helpers/getGeoLocation";
import { RequestWithUser } from "../User/user.constant";
import { parseUserAgent } from "@helpers/parseUserAgent";

const createQrCode = CatchAsync(async (req, res) => {
  const result = await QRCodeService.createQRCode(req);
  SendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "QR Code Created Successfully!",
    data: result,
  });
});

const updateQrCode = CatchAsync(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const result = await QRCodeService.updateQRCode(id, data);
  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Code Updated Successfully!",
    data: result,
  });
});
const deleteQrCode = CatchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await QRCodeService.deleteQRCode(id);
  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Code deleted Successfully!",
    data: result,
  });
});

const trackScan = CatchAsync(async (req, res) => {
  const { qrId, fingerprint, lat, lon } = req.body;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(",")[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  const location = await getGeoLocation(ip);
  const { deviceType, os, browser } = parseUserAgent(userAgent);

  const { scan, isUnique } = await QRCodeService.trackScan(
    qrId,
    fingerprint,
    userAgent,
    ip,
    location,
    deviceType,
    os,
    browser,
    lat,
    lon
  );

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Code scan tracked successfully",
    data: { isUnique, scan },
  });
});

const getMyQRCodes = CatchAsync(async (req: RequestWithUser, res) => {
  const creatorId = req.user?.id;
  const qrCodes = await QRCodeService.getAllQRCodes(creatorId);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Codes fetched successfully",
    data: qrCodes,
  });
});
const getDashboardStats = CatchAsync(async (req: RequestWithUser, res) => {
  const creatorId = req.user?.id;
  const dashboardData = await QRCodeService.getDashboardStats(creatorId);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Codes fetched successfully",
    data: dashboardData,
  });
});
const getDashboardAnalytics = CatchAsync(async (req: RequestWithUser, res) => {
  const creatorId = req.user?.id;
  const dashboardData = await QRCodeService.getDashboardAnalytics(creatorId);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Codes fetched successfully",
    data: dashboardData,
  });
});


const getSingleQRData = CatchAsync(async (req: RequestWithUser, res) => {
  const id = req.params?.id;
  const qrCodeData = await QRCodeService.getSingleQRData(id);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "QR Code data fetched successfully",
    data: qrCodeData,
  });
});

const getQRCodeScanSettings = CatchAsync(async (req: RequestWithUser, res) => {
  const id = req.params?.id;
  const qrCodeData = await QRCodeService.getQRCodeScanSettings(id);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Scan Settings fetched successfully",
    data: qrCodeData,
  });
});




export const QRCodeController = {
  createQrCode,
  updateQrCode,
  trackScan,
  getMyQRCodes,
  getSingleQRData,
  deleteQrCode,
  getDashboardStats,
  getDashboardAnalytics,
  getQRCodeScanSettings
};
