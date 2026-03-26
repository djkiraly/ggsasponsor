import { integer, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for GGSA sponsorship portal.
 * All monetary values are stored as integer cents.
 */

export const sponsorships = pgTable("sponsorships", {
  id: uuid("id").primaryKey().defaultRandom(),

  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  // Applicant info
  name: text("name").notNull(),
  company: text("company"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),

  // Sponsorship
  sponsorship_type: text("sponsorship_type").notNull(), // 'team' | 'banner' | 'both'
  amount_paid_cents: integer("amount_paid_cents").notNull(),

  // Files
  logo_gcs_url: text("logo_gcs_url"),
  banner_gcs_url: text("banner_gcs_url"),

  // Payment
  stripe_payment_intent_id: text("stripe_payment_intent_id").unique(),
  stripe_payment_status: text("stripe_payment_status"), // 'pending' | 'succeeded' | 'failed'
  payment_method_type: text("payment_method_type"), // 'card' | 'us_bank_account'

  // Admin
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

