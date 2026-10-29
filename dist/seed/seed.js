"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const role_model_1 = require("../modules/roles/role.model");
const user_model_1 = require("../modules/users/user.model");
const lookup_model_1 = require("../modules/lookups/lookup.model");
const allPermissions = ['case:create', 'case:read:all', 'case:update', 'case:delete', 'hearing:create', 'document:create', 'calendar:manage', 'settings:read', 'settings:manage', 'user:manage', 'report:export'];
async function seed() {
    await (0, database_1.connectDatabase)();
    const roleDefinitions = [
        { name: 'Super Admin', permissions: allPermissions, isSystemRole: true },
        { name: 'Administrator', permissions: allPermissions.filter((permission) => !['settings:manage'].includes(permission)), isSystemRole: true },
        { name: 'Legal Assistant', permissions: ['case:create', 'case:update', 'hearing:create', 'document:create'], isSystemRole: true },
        { name: 'Standard User', permissions: ['case:create', 'case:update', 'hearing:create', 'document:create'], isSystemRole: true },
        { name: 'Viewer', permissions: [], isSystemRole: true }
    ];
    const roles = new Map();
    for (const definition of roleDefinitions)
        roles.set(definition.name, (await role_model_1.Role.findOneAndUpdate({ name: definition.name }, definition, { upsert: true, new: true })).id);
    const defaultUsers = [
        { name: 'System Administrator', username: env_1.env.SEED_SUPER_ADMIN_USERNAME, email: env_1.env.SEED_SUPER_ADMIN_EMAIL, password: env_1.env.SEED_SUPER_ADMIN_PASSWORD, roleName: 'Super Admin' },
        { name: 'Administrator', username: env_1.env.SEED_ADMIN_USERNAME, email: env_1.env.SEED_ADMIN_EMAIL, password: env_1.env.SEED_ADMIN_PASSWORD, roleName: 'Administrator' }
    ];
    for (const userSeed of defaultUsers) {
        const passwordHash = await bcryptjs_1.default.hash(userSeed.password, 12);
        await user_model_1.User.findOneAndUpdate({ username: userSeed.username }, {
            name: userSeed.name,
            email: userSeed.email,
            username: userSeed.username,
            passwordHash,
            role: roles.get(userSeed.roleName),
            status: 'active'
        }, { upsert: true, new: true });
    }
    await lookup_model_1.Court.bulkWrite([{ updateOne: { filter: { name: 'District Court' }, update: { $setOnInsert: { name: 'District Court', type: 'District' } }, upsert: true } }]);
    await lookup_model_1.Location.bulkWrite([{ updateOne: { filter: { name: 'Pune' }, update: { $setOnInsert: { name: 'Pune', district: 'Pune', state: 'Maharashtra' } }, upsert: true } }]);
    console.log('Database seeded successfully');
    await (0, database_1.disconnectDatabase)();
}
seed().catch(async (error) => { console.error(error); await (0, database_1.disconnectDatabase)(); process.exitCode = 1; });
