import DataLoader from 'dataloader';
import { Post, Profile, User, MemberType, PrismaClient } from '@prisma/client';

export function createMemberTypeLoader(prisma: PrismaClient) {
  return new DataLoader<string, MemberType | null>(async (ids) => {
    const types = await prisma.memberType.findMany({
      where: { id: { in: ids as string[] } },
    });
    const typeMap = new Map<string, MemberType>();
    types.forEach((type) => typeMap.set(type.id, type));
    return ids.map((id) => typeMap.get(id) ?? null);
  });
}

export function createPostsLoader(prisma: PrismaClient) {
  return new DataLoader<string, Post[]>(async (authorIds) => {
    const posts = await prisma.post.findMany({
      where: { authorId: { in: authorIds as string[] } },
    });
    const postsByAuthor = new Map<string, Post[]>();
    posts.forEach((post) => {
      if (!postsByAuthor.has(post.authorId)) {
        postsByAuthor.set(post.authorId, []);
      }
      postsByAuthor.get(post.authorId)!.push(post);
    });
    return authorIds.map((id) => postsByAuthor.get(id) ?? []);
  });
}

export function createProfileLoader(prisma: PrismaClient) {
  return new DataLoader<string, Profile | null>(async (userIds) => {
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: userIds as string[] } },
    });
    const profileMap = new Map<string, Profile>();
    profiles.forEach((profile) => profileMap.set(profile.userId, profile));
    return userIds.map((id) => profileMap.get(id) ?? null);
  });
}

export function createUserLoader(prisma: PrismaClient) {
  return new DataLoader<string, User | undefined>(async (ids) => {
    const users = await prisma.user.findMany({
      where: { id: { in: ids as string[] } },
    });
    const userMap = new Map<string, User>();
    users.forEach((user) => userMap.set(user.id, user));
    return ids.map((id) => userMap.get(id));
  });
}

export function createUserSubscribedToLoader(prisma: PrismaClient) {
  return new DataLoader<string, User[]>(async (userIds) => {
    const subs = await prisma.subscribersOnAuthors.findMany({
      where: { subscriberId: { in: userIds as string[] } },
      include: { author: true },
    });
    const authorsBySubscriber = new Map<string, User[]>();
    userIds.forEach((id) => authorsBySubscriber.set(id, []));
    subs.forEach((sub) => {
      authorsBySubscriber.get(sub.subscriberId)!.push(sub.author);
    });
    return userIds.map((id) => authorsBySubscriber.get(id) ?? []);
  });
}

export function createSubscribedToUserLoader(prisma: PrismaClient) {
  return new DataLoader<string, User[]>(async (authorIds) => {
    const subs = await prisma.subscribersOnAuthors.findMany({
      where: { authorId: { in: authorIds as string[] } },
      include: { subscriber: true },
    });
    const subscribersByAuthor = new Map<string, User[]>();
    authorIds.forEach((id) => subscribersByAuthor.set(id, []));
    subs.forEach((sub) => {
      subscribersByAuthor.get(sub.authorId)!.push(sub.subscriber);
    });
    return authorIds.map((id) => subscribersByAuthor.get(id) ?? []);
  });
}
