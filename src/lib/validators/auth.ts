import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email invalid" }).max(255),
  password: z.string().min(8, { message: "Minim 8 caractere" }).max(128),
});

export const registerSchema = z.object({
  email: z.string().trim().email({ message: "Email invalid" }).max(255),
  password: z
    .string()
    .min(8, { message: "Minim 8 caractere" })
    .max(128)
    .regex(/[A-Z]/, { message: "Cel puțin o literă mare" })
    .regex(/[0-9]/, { message: "Cel puțin o cifră" }),
  displayName: z.string().trim().min(2, { message: "Minim 2 caractere" }).max(100),
  entityType: z.enum(["individual", "srl", "pfa", "ii", "other"]),
});

export const forgotSchema = z.object({
  email: z.string().trim().email({ message: "Email invalid" }).max(255),
});

export const resetSchema = z
  .object({
    password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[0-9]/),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Parolele nu coincid",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
