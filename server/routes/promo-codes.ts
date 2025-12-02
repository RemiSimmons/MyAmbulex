import express from "express";
import { storage } from "../storage";
import { promoCodeService } from "../promo-code-service";

const router = express.Router();

// POST /api/promo-codes/validate
router.post("/validate", async (req, res) => {
  try {
    const { code, originalAmount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!code || !originalAmount) {
      return res.status(400).json({ message: "Code and original amount are required" });
    }

    const validationResult = await promoCodeService.validatePromoCode(
      code, 
      userId, 
      parseFloat(originalAmount),
      req.user?.role || 'rider'
    );

    if (!validationResult.success) {
      return res.status(400).json({ 
        valid: false, 
        error: validationResult.description 
      });
    }

    // Calculate discounted price
    const priceCalculation = promoCodeService.calculateDiscountedPrice(
      parseFloat(originalAmount), 
      validationResult.promoCode
    );

    res.json({
      valid: true,
      promoCode: validationResult.promoCode,
      calculation: priceCalculation
    });

  } catch (error) {
    console.error("Error validating promo code:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/promo-codes/apply
router.post("/apply", async (req, res) => {
  try {
    const { code, rideId, originalAmount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!code || !originalAmount) {
      return res.status(400).json({ message: "Code and original amount are required" });
    }

    const result = await promoCodeService.applyPromoCodeToRide(
      code,
      userId,
      rideId || null,
      parseFloat(originalAmount)
    );

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.description 
      });
    }

    res.json({
      success: true,
      originalAmount: result.originalAmount,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      description: result.description
    });

  } catch (error) {
    console.error("Error applying promo code:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;