import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createLicense,
  getLicenseByKey,
  getAllLicenses,
  updateLicenseFeatures,
  validateLicense,
  isLicenseExpired,
  getLicenseFeatures,
} from "../license-manager";

export const licenseRouter = router({
  /**
   * Create a new license
   */
  create: publicProcedure
    .input(
      z.object({
        packageType: z.enum(["basic", "pro", "premium", "unlimited"]),
        broadcasterName: z.string().min(1),
        broadcasterEmail: z.string().email(),
        licenseDuration: z.number().min(1),
        maxSessions: z.number().min(1),
        maxPlayers: z.number().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const result = await createLicense(
        input.packageType,
        input.broadcasterName,
        input.broadcasterEmail,
        input.licenseDuration,
        input.maxSessions,
        input.maxPlayers
      );

      return result;
    }),

  /**
   * Get license by key
   */
  getByKey: publicProcedure
    .input(z.object({ licenseKey: z.string() }))
    .query(async ({ input }) => {
      const license = await getLicenseByKey(input.licenseKey);
      return license || null;
    }),

  /**
   * Get all licenses
   */
  getAll: publicProcedure.query(async () => {
    const licenses = await getAllLicenses();
    return licenses;
  }),

  /**
   * Validate license
   */
  validate: publicProcedure
    .input(z.object({ licenseKey: z.string() }))
    .query(async ({ input }) => {
      const isValid = await validateLicense(input.licenseKey);
      return { isValid };
    }),

  /**
   * Check if license is expired
   */
  isExpired: publicProcedure
    .input(z.object({ licenseKey: z.string() }))
    .query(async ({ input }) => {
      const expired = await isLicenseExpired(input.licenseKey);
      return { isExpired: expired };
    }),

  /**
   * Update license features
   */
  updateFeatures: publicProcedure
    .input(
      z.object({
        packageType: z.enum(["basic", "pro", "premium", "unlimited"]),
        features: z.object({
          telegram: z.boolean(),
          autoMode: z.boolean(),
          analytics: z.boolean(),
          customTeams: z.boolean(),
          multiSession: z.boolean(),
          apiAccess: z.boolean(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const result = await updateLicenseFeatures(input.packageType, input.features);
      return result;
    }),

  /**
   * Get license features
   */
  getFeatures: publicProcedure
    .input(z.object({ packageType: z.enum(["basic", "pro", "premium", "unlimited"]) }))
    .query(async ({ input }) => {
      const features = await getLicenseFeatures(input.packageType);
      return features;
    }),
});
