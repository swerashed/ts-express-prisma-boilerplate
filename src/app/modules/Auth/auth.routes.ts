import express from "express";
import { AuthController } from "./auth.controller";
import { UserRole } from "@prisma/client";
import auth from "@middleware/auth";
import validateRequest from "@middleware/validationRequest";
import { AuthValidation } from "./auth.validation";
const router = express.Router();
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: P@$$word
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validateRequest(AuthValidation.loginSchema), AuthController.loginUser);


router.post("/refresh-token", AuthController.refreshToken);
router.post(
  "/change-password",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER),
  AuthController.changePassword
);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-email", AuthController.verifyOtp);
router.post("/resend-otp", AuthController.resendOtp);
router.post(
  "/reset-password",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER),
  AuthController.resetPassword
);

export const AuthRoutes = router;
