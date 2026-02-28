import { prisma } from "../utils/prisma";

export async function syncUserFromClerk(payload: any) {
  const clerkUserId = payload.sub;
  const email = payload.email;

  if (!clerkUserId || !email) {
    throw new Error("Invalid Clerk token payload");
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: clerkUserId },
  });

  if (existingUser) {
    return existingUser;
  }

  // Create user if not exists
  return prisma.user.create({
    data: {
      id: clerkUserId,
      email,
    },
  });
}
