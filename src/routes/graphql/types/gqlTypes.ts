import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLEnumType,
  GraphQLResolveInfo,
} from 'graphql';
import { UUIDType } from './uuid.js';
import { PrismaClient } from '@prisma/client';
import { parseResolveInfo } from 'graphql-parse-resolve-info';

import type { User, Profile, Post, MemberType } from '@prisma/client';
import DataLoader from 'dataloader';

type GqlContext = {
  prisma: PrismaClient;
  loaders: {
    userLoader: DataLoader<string, User | undefined>;
    profileLoader: DataLoader<string, Profile | null>;
    postsLoader: DataLoader<string, Post[]>;
    memberTypeLoader: DataLoader<string, MemberType | null>;
    userSubscribedToLoader: DataLoader<string, User[]>;
    subscribedToUserLoader: DataLoader<string, User[]>;
  };
};
type CreateUserArgs = { dto: { name: string; balance: number } };
type CreateProfileArgs = { dto: { isMale: boolean; yearOfBirth: number; userId: string; memberTypeId: string } };
type CreatePostArgs = { dto: { title: string; content: string; authorId: string } };
type ChangeUserArgs = { id: string; dto: { name?: string; balance?: number } };
type ChangeProfileArgs = { id: string; dto: { isMale?: boolean; yearOfBirth?: number; memberTypeId?: string } };
type ChangePostArgs = { id: string; dto: { title?: string; content?: string } };
type DeleteArgs = { id: string };
type SubscribeArgs = { userId: string; authorId: string };


const MemberTypeIdEnum = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: 'BASIC' },
    BUSINESS: { value: 'BUSINESS' },
  },
});

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdEnum) },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  },
});

const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    memberTypeId: { type: MemberTypeIdEnum },
  },
});

const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const MemberTypeType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const PostType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const ProfileType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    memberType: {
      type: new GraphQLNonNull(MemberTypeType),
      resolve: async (profile:Profile, _args, { loaders }: GqlContext) => {
        return loaders.memberTypeLoader.load(profile.memberTypeId)
      },
    },
  }),
});

let UserType: GraphQLObjectType<User, GqlContext>;
// eslint-disable-next-line prefer-const
UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    profile: {
      type: ProfileType,
      resolve: async (user: User, _args, { loaders }: GqlContext) => {
        return loaders.profileLoader.load(user.id)
      },
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: async (user, _args, { loaders }) => {
        return loaders.postsLoader.load(user.id)
      },
    },
    userSubscribedTo: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (user: User & { userSubscribedTo?: { authorId: string }[]}, _args, { loaders }, info) => {
        if (user.userSubscribedTo) {
          return user.userSubscribedTo.map((sub) => ({ id: sub.authorId }));
        }
        return loaders.userSubscribedToLoader.load(user.id);
      },
    },
    subscribedToUser: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (user: User & { subscribedToUser?: { subscriberId: string }[]}, _args, { loaders }, info) => {
        if (user.subscribedToUser) {
          return user.subscribedToUser.map((sub) => ({ id: sub.subscriberId }));
        }
        return loaders.subscribedToUserLoader.load(user.id);
      },
    },
  }),
});

const RootQueryType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: () => ({
    memberTypes: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberTypeType))),
      resolve: (_root, _args, { prisma }: GqlContext) => prisma.memberType.findMany(),
    },
    memberType: {
      type: MemberTypeType,
      args: { id: { type: new GraphQLNonNull(MemberTypeIdEnum) } },
      resolve: (_root, { id }: MemberType, { prisma }) => prisma.memberType.findUnique({ where: { id } }),
    },
    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(UserType))),
      resolve: async (_root, _args, { prisma ,loaders }, info: GraphQLResolveInfo) => {
        const parsedInfo = parseResolveInfo(info);
        const fields = parsedInfo?.fieldsByTypeName?.User ?? {};
        const needSubscribedToUser = 'subscribedToUser' in fields;
        const needUserSubscribedTo = 'userSubscribedTo' in fields;

        // Формируем include только с нужными ключами
        const include: {
          subscribedToUser?: boolean;
          userSubscribedTo?: boolean;
        } = {};
        if (needSubscribedToUser) include.subscribedToUser = true;
        if (needUserSubscribedTo) include.userSubscribedTo = true;

        type Users = (User & {
          subscribedToUser?: { subscriberId: string }[];
          userSubscribedTo?: { authorId: string }[];
        })[]

        const users: Users = Object.keys(include).length > 0
          ? await prisma.user.findMany({ include })
          : await prisma.user.findMany();

        users.forEach((user) => {
          loaders.userLoader.prime(user.id, user);

          if (needUserSubscribedTo && user.userSubscribedTo) {
            const authorIds = user.userSubscribedTo.map((sub) => sub.authorId);
            const authors = users.filter((u) => authorIds.includes(u.id));
            loaders.userSubscribedToLoader.prime(user.id, authors);
          }

          if (needSubscribedToUser && user.subscribedToUser) {
            const subscriberIds = user.subscribedToUser.map((sub) => sub.subscriberId);
            const subscribers = users.filter((u) => subscriberIds.includes(u.id));
            loaders.subscribedToUserLoader.prime(user.id, subscribers);
          }
        });
        return users;
      },
    },
    user: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: (_root, { id }: User, { prisma }) => prisma.user.findUnique({ where: { id } }),
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(PostType))),
      resolve: (_root, _args, { prisma }) => prisma.post.findMany(),
    },
    post: {
      type: PostType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: (_root, { id }: Post, { prisma }) => prisma.post.findUnique({ where: { id } }),
    },
    profiles: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(ProfileType))),
      resolve: (_root, _args, { prisma }) => prisma.profile.findMany(),
    },
    profile: {
      type: ProfileType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: (_root, { id }: Profile, { prisma }) => prisma.profile.findUnique({ where: { id } }),
    },
  }),
});

const MutationsType = new GraphQLObjectType({
  name: 'Mutations',
  fields: () => ({
    createUser: {
      type: new GraphQLNonNull(UserType),
      args: { dto: { type: new GraphQLNonNull(CreateUserInput) } },
      resolve: async (_root, args: CreateUserArgs, { prisma }: GqlContext) => {
        return prisma.user.create({ data: args.dto });
      },
    },
    createProfile: {
      type: new GraphQLNonNull(ProfileType),
      args: { dto: { type: new GraphQLNonNull(CreateProfileInput) } },
      resolve: async (_root, args: CreateProfileArgs, { prisma }: GqlContext) => {
        return prisma.profile.create({ data: args.dto });
      },
    },
    createPost: {
      type: new GraphQLNonNull(PostType),
      args: { dto: { type: new GraphQLNonNull(CreatePostInput) } },
      resolve: async (_root, args: CreatePostArgs, { prisma }: GqlContext) => {
        return prisma.post.create({ data: args.dto });
      },
    },
    changePost: {
      type: new GraphQLNonNull(PostType),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangePostInput) },
      },
      resolve: async (_root, args: ChangePostArgs, { prisma }: GqlContext) => {
        return prisma.post.update({ where: { id: args.id }, data: args.dto });
      },
    },
    changeProfile: {
      type: new GraphQLNonNull(ProfileType),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeProfileInput) },
      },
      resolve: async (_root, args: ChangeProfileArgs, { prisma }: GqlContext) => {
        return prisma.profile.update({ where: { id: args.id }, data: args.dto });
      },
    },
    changeUser: {
      type: new GraphQLNonNull(UserType),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeUserInput) },
      },
      resolve: async (_root, args: ChangeUserArgs, { prisma }: GqlContext) => {
        return prisma.user.update({ where: { id: args.id }, data: args.dto });
      },
    },
    deleteUser: {
      type: new GraphQLNonNull(GraphQLString),
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_root, args: DeleteArgs, { prisma }: GqlContext) => {
        await prisma.user.delete({ where: { id: args.id } });
        return args.id;
      },
    },
    deletePost: {
      type: new GraphQLNonNull(GraphQLString),
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_root, args: DeleteArgs, { prisma }: GqlContext) => {
        await prisma.post.delete({ where: { id: args.id } });
        return args.id;
      },
    },
    deleteProfile: {
      type: new GraphQLNonNull(GraphQLString),
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_root, args: DeleteArgs, { prisma }: GqlContext) => {
        await prisma.profile.delete({ where: { id: args.id } });
        return args.id;
      },
    },
    subscribeTo: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_root, args: SubscribeArgs, { prisma }: GqlContext) => {
        await prisma.subscribersOnAuthors.create({
          data: { subscriberId: args.userId, authorId: args.authorId },
        });
        return args.userId;
      },
    },
    unsubscribeFrom: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: async (_root, args: SubscribeArgs, { prisma }: GqlContext) => {
        await prisma.subscribersOnAuthors.delete({
          where: { subscriberId_authorId: { subscriberId: args.userId, authorId: args.authorId } },
        });
        return args.userId;
      },
    },
  }),
});

export const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: MutationsType,
  types: [UserType, ProfileType, PostType, MemberTypeType],
});
