import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Role } from '../modules/roles/role.model';
import { User } from '../modules/users/user.model';
import { Court, Location } from '../modules/lookups/lookup.model';

const allPermissions = ['case:create', 'case:read:all', 'case:update', 'case:delete', 'hearing:create', 'document:create', 'calendar:manage', 'settings:read', 'settings:manage', 'user:manage', 'report:export'];

async function seed(): Promise<void> {
  await connectDatabase();
  const roleDefinitions = [
    { name: 'Super Admin', permissions: allPermissions, isSystemRole: true },
    { name: 'Administrator', permissions: allPermissions.filter((permission) => !['settings:manage'].includes(permission)), isSystemRole: true },
    { name: 'Legal Assistant', permissions: ['case:create', 'case:update', 'hearing:create', 'document:create'], isSystemRole: true },
    { name: 'Standard User', permissions: ['case:create', 'case:update', 'hearing:create', 'document:create'], isSystemRole: true },
    { name: 'Viewer', permissions: ['case:read:all'], isSystemRole: true }
  ];
  const roles = new Map<string, string>();
  for (const definition of roleDefinitions) roles.set(definition.name, (await Role.findOneAndUpdate({ name: definition.name }, definition, { upsert: true, new: true })).id);
  const defaultUsers = [
    { name: 'System Administrator', username: env.SEED_SUPER_ADMIN_USERNAME, email: env.SEED_SUPER_ADMIN_EMAIL, password: env.SEED_SUPER_ADMIN_PASSWORD, roleName: 'Super Admin' },
    { name: 'Administrator', username: env.SEED_ADMIN_USERNAME, email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD, roleName: 'Administrator' }
  ];

  for (const userSeed of defaultUsers) {
    const passwordHash = await bcrypt.hash(userSeed.password, 12);
    await User.findOneAndUpdate(
      { username: userSeed.username },
      {
        name: userSeed.name,
        email: userSeed.email,
        username: userSeed.username,
        passwordHash,
        role: roles.get(userSeed.roleName),
        status: 'active'
      },
      { upsert: true, new: true }
    );
  }

  await Court.bulkWrite([{ updateOne: { filter: { name: 'District Court' }, update: { $setOnInsert: { name: 'District Court', type: 'District' } }, upsert: true } }]);
  await Location.bulkWrite([{ updateOne: { filter: { name: 'Pune' }, update: { $setOnInsert: { name: 'Pune', district: 'Pune', state: 'Maharashtra' } }, upsert: true } }]);
  console.log('Database seeded successfully');
  await disconnectDatabase();
}

seed().catch(async (error: unknown) => { console.error(error); await disconnectDatabase(); process.exitCode = 1; });