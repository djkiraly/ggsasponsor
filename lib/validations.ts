import { z } from "zod";

export const SponsorshipTypeSchema = z.enum(["team", "banner", "both"]);
export type SponsorshipType = z.infer<typeof SponsorshipTypeSchema>;

export const PaymentMethodTypeSchema = z.enum(["card", "us_bank_account", "check"]);
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;

const gcsUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      const bucket = process.env.GCS_BUCKET_NAME;
      if (!bucket) return true; // skip check if bucket not configured (dev)
      return url.startsWith(`https://storage.googleapis.com/${bucket}/`);
    },
    { message: "URL must point to the authorized GCS bucket" }
  );

export const CreatePaymentIntentBodySchema = z.object({
  sponsorshipType: SponsorshipTypeSchema,
  paymentMethodType: PaymentMethodTypeSchema,
  // Optional but used for traceability metadata on the PaymentIntent.
  applicantEmail: z.string().email().optional(),
});

export const CreateSponsorshipBodySchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1).optional(),

  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zip: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^[\d\s().+\-]{7,20}$/, "Invalid phone number format"),

  sponsorshipType: SponsorshipTypeSchema,
  paymentMethodType: PaymentMethodTypeSchema,

  jerseyColorPrimary: z.string().min(1).optional(),
  jerseyColorSecondary: z.string().min(1).optional(),

  logoGcsUrl: gcsUrlSchema.optional(),
  bannerGcsUrl: gcsUrlSchema.optional(),

  stripePaymentIntentId: z.string().min(1),
});

export const CreateCheckSponsorshipBodySchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1).optional(),

  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zip: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^[\d\s().+\-]{7,20}$/, "Invalid phone number format"),

  sponsorshipType: SponsorshipTypeSchema,

  jerseyColorPrimary: z.string().min(1).optional(),
  jerseyColorSecondary: z.string().min(1).optional(),

  logoGcsUrl: gcsUrlSchema.optional(),
  bannerGcsUrl: gcsUrlSchema.optional(),

  checkReceivedBy: z.string().min(1),
  amountCents: z.number().int().positive(),
});

