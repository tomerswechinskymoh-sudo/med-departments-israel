import crypto from "crypto";
import { RoleKey } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import { setSessionCookie, toAppSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { SocialAccountIntent, SocialAuthProvider, SocialProfile } from "@/lib/social-auth";

function providerWhere(provider: SocialAuthProvider, providerUserId: string) {
  if (provider === "google") {
    return { googleId: providerUserId };
  }

  return { facebookId: providerUserId };
}

function providerData(provider: SocialAuthProvider, providerUserId: string) {
  if (provider === "google") {
    return { googleId: providerUserId };
  }

  return { facebookId: providerUserId };
}

export async function completeSocialAuth(input: {
  provider: SocialAuthProvider;
  profile: SocialProfile;
  nextPath?: string;
  accountIntent?: SocialAccountIntent;
}) {
  const userByProvider = await prisma.user.findFirst({
    where: {
      ...providerWhere(input.provider, input.profile.providerUserId)
    }
  });

  if (userByProvider) {
    if (userByProvider.roleKey === RoleKey.ADMIN) {
      return { errorCode: "admin_not_allowed" as const };
    }

    if (userByProvider.roleKey === RoleKey.REPRESENTATIVE) {
      return { errorCode: "representative_requires_existing_login" as const };
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userByProvider.id
      },
      data: {
        fullName: input.profile.fullName,
        profileImageUrl: input.profile.profileImageUrl
      }
    });

    await createAuditLog({
      actorUserId: updatedUser.id,
      action: `auth.${input.provider}_login`,
      entityType: "User",
      entityId: updatedUser.id
    });

    await setSessionCookie(toAppSession(updatedUser));
    return {
      redirectPath:
        input.nextPath ??
        (updatedUser.roleKey === RoleKey.REPRESENTATIVE ? "/representative" : "/dashboard")
    };
  }

  const userByEmail = await prisma.user.findUnique({
    where: {
      email: input.profile.email
    }
  });

  if (userByEmail) {
    if (userByEmail.roleKey === RoleKey.ADMIN) {
      return { errorCode: "admin_not_allowed" as const };
    }

    if (userByEmail.roleKey === RoleKey.REPRESENTATIVE) {
      return { errorCode: "representative_requires_existing_login" as const };
    }

    const existingProviderOwner = await prisma.user.findFirst({
      where: {
        ...providerWhere(input.provider, input.profile.providerUserId),
        id: {
          not: userByEmail.id
        }
      },
      select: {
        id: true
      }
    });

    if (existingProviderOwner) {
      return { errorCode: "provider_already_connected" as const };
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userByEmail.id
      },
      data: {
        fullName: input.profile.fullName,
        profileImageUrl: input.profile.profileImageUrl,
        ...providerData(input.provider, input.profile.providerUserId)
      }
    });

    await createAuditLog({
      actorUserId: updatedUser.id,
      action: `auth.${input.provider}_connected`,
      entityType: "User",
      entityId: updatedUser.id
    });

    await setSessionCookie(toAppSession(updatedUser));
    return {
      redirectPath:
        input.nextPath ??
        (updatedUser.roleKey === RoleKey.REPRESENTATIVE ? "/representative" : "/dashboard")
    };
  }

  const roleKey = input.accountIntent === "resident" ? RoleKey.RESIDENT : RoleKey.STUDENT;
  const passwordHash = await hashPassword(`${crypto.randomUUID()}-${crypto.randomUUID()}`);
  const createdUser = await prisma.user.create({
    data: {
      email: input.profile.email,
      fullName: input.profile.fullName,
      passwordHash,
      roleKey,
      profileImageUrl: input.profile.profileImageUrl,
      ...providerData(input.provider, input.profile.providerUserId)
    }
  });

  await createAuditLog({
    actorUserId: createdUser.id,
    action: `auth.${input.provider}_signup`,
    entityType: "User",
    entityId: createdUser.id,
    metadata: {
      accountIntent: input.accountIntent ?? "student"
    }
  });

  await setSessionCookie(toAppSession(createdUser));
  return {
    redirectPath: input.nextPath ?? "/dashboard"
  };
}
