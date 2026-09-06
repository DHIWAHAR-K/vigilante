import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(
  env: Record<string, string | undefined> = process.env,
): PublicEnv {
  const result = publicEnvSchema.safeParse(env);

  if (!result.success) {
    const missing = result.error.issues.map(issue => issue.path.join(".")).join(", ");
    throw new Error(`Missing or invalid public environment: ${missing}`);
  }

  return result.data;
}
