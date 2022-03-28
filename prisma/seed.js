const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const UtilsService = require('../src/utils/UtilsService');

const utilsService = new UtilsService();

async function main() {
  const user1 = await prisma.users.upsert({
    where: { id: 'e2667227-79a6-4647-9ff9-49f6a484023b' },
    update: {},
    create: {
      id: 'e2667227-79a6-4647-9ff9-49f6a484023b',
      email: 'phungthienphuc18@gmaill.com',
      password: await utilsService.hashingPassword('12341234'),
      username: 'Phuc Phung',
      account_type: 'default',
    },
  });

  const user2 = await prisma.users.upsert({
    where: { id: '63e9843c-4025-41a9-9942-dfa977336467' },
    update: {},
    create: {
      id: '63e9843c-4025-41a9-9942-dfa977336467',
      email: 'ngan.nguyen@eastplayers.io',
      password: await utilsService.hashingPassword('12341234'),
      username: 'Ngan Nguyen',
      account_type: 'default',
    },
  });

  const user3 = await prisma.users.upsert({
    where: { id: '4e0db6c0-c255-4a1c-b67b-0ca3d2db66db' },
    update: {},
    create: {
      id: '4e0db6c0-c255-4a1c-b67b-0ca3d2db66db',
      email: 'thuy.vu@eastplayers.io',
      password: await utilsService.hashingPassword('12341234'),
      username: 'Thuy Vu',
      account_type: 'default',
    },
  });

  const user4 = await prisma.users.upsert({
    where: { id: '8a5fa04b-5150-468c-98e5-3250d8c42be9' },
    update: {},
    create: {
      id: '8a5fa04b-5150-468c-98e5-3250d8c42be9',
      email: 'quyen.le@eastplayers.io',
      password: await utilsService.hashingPassword('12341234'),
      username: 'Quyen Le',
      account_type: 'default',
    },
  });

  console.log(user1, user2, user3, user4);

  const oa1 = await prisma.users.upsert({
    where: { id: '0d72bf4d-949b-4108-aa13-fd0db3f273b0' },
    update: {},
    create: {
      id: '0d72bf4d-949b-4108-aa13-fd0db3f273b0',
      account_type: 'oa',
    },
  });

  const oa2 = await prisma.users.upsert({
    where: { id: 'e2667227-79a6-4647-9ff9-49f6a484023b' },
    update: {},
    create: {
      id: '7fe39a76-620f-4426-b841-9fc275fa8d98',
      account_type: 'oa',
    },
  });

  const oa3 = await prisma.users.upsert({
    where: { id: 'a7f1b48a-e47a-4fa3-9109-5f0406e49ebc' },
    update: {},
    create: {
      id: 'a7f1b48a-e47a-4fa3-9109-5f0406e49ebc',
      account_type: 'oa',
    },
  });

  const oa4 = await prisma.users.upsert({
    where: { id: '842c59d2-a721-479b-8fe4-fff3fd98275f' },
    update: {},
    create: {
      id: '842c59d2-a721-479b-8fe4-fff3fd98275f',
      account_type: 'oa',
    },
  });

  console.log(oa1, oa2, oa3, oa4);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
