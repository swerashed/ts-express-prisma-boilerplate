import { AuthService } from "./auth.service";
import { StatusCodes } from "http-status-codes";
import CatchAsync from "@utils/CatchAsync";
import SendResponse from "@utils/SendResponse";


const loginUser = CatchAsync(async (req, res) => {
  const result = await AuthService.loginUser(req.body);
  const { refreshToken } = result;
  res.cookie("refreshToken", refreshToken, {
    secure: false,
    httpOnly: true,
  });
  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Logged in Successful",
    data: {
      accessToken: result.accessToken,
      // needPasswordChange: result.needPasswordChange,
    },
  });
});

const refreshToken = CatchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await AuthService.refreshToken(refreshToken);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Access Token Generated Successfully!",
    data: result,
  });
});

const changePassword = CatchAsync(async (req, res) => {
  const user = req?.body.user;
  const result = await AuthService.changePassword(user, req.body);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
}
);

const forgotPassword = CatchAsync(async (req, res) => {
  await AuthService.forgotPassword(req.body);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Check your email",
    data: null,
  });
});

const resetPassword = CatchAsync(async (req, res) => {
  const token = req.headers.authorization || "";

  await AuthService.resetPassword(token, req.body);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password Reset Successfully",
    data: null,
  });
});

const verifyOtp = CatchAsync(async (req, res) => {
  const result = await AuthService.verifyOtp(req.body);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Email Verified Successfully",
    data: result,
  });
});

const resendOtp = CatchAsync(async (req, res) => {
  const result = await AuthService.resendOtp(req.body);

  SendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP resent successfully",
    data: result,
  });
});

export const AuthController = {
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
};
