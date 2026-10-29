"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const env_1 = require("./config/env");
async function start() {
    await (0, database_1.connectDatabase)();
    app_1.default.listen(env_1.env.PORT, () => console.log(`Legal Case MIS API listening on port ${env_1.env.PORT}`));
}
if (process.env.VERCEL !== '1') {
    start().catch((error) => {
        console.error('Failed to connect to MongoDB. Check MONGO_URI and MongoDB Atlas network access.', error);
        process.exit(1);
    });
}
