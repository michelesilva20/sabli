import { z } from 'zod';

export const tokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresInSeconds: z.number().int().positive(),
  tokenType: z.string().min(1),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  status: z.string().min(1),
});

export const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: z.string().min(1),
});

export const establishmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  status: z.string().min(1),
});

export const organizationMembershipSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().min(1),
  status: z.string().min(1),
});

export const establishmentMembershipSchema = z.object({
  establishmentId: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.string().min(1),
  status: z.string().min(1),
});

export const meResponseSchema = z.object({
  user: userSchema,
  organizations: z.array(organizationSchema),
  organizationMemberships: z.array(organizationMembershipSchema),
  establishments: z.array(establishmentSchema),
  establishmentMemberships: z.array(establishmentMembershipSchema),
  lastOrganizationId: z.string().uuid().nullable().optional(),
  lastEstablishmentId: z.string().uuid().nullable().optional(),
});

export const contextResponseSchema = z.object({
  organization: organizationSchema,
  establishment: establishmentSchema.nullable().optional(),
  organizationRole: z.string().nullable().optional(),
  establishmentRole: z.string().nullable().optional(),
});

export const problemDetailSchema = z.object({
  title: z.string().optional(),
  detail: z.string().optional(),
  status: z.number().optional(),
  code: z.string().optional(),
  expectedTotalCents: z.number().int().optional(),
  actualTotalCents: z.number().int().optional(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type ContextResponse = z.infer<typeof contextResponseSchema>;
export type EstablishmentRecord = z.infer<typeof establishmentSchema>;
export type OrganizationRecord = z.infer<typeof organizationSchema>;
