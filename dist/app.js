"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_1 = require("./config/swagger");
const database_1 = require("./config/database");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const isLocalDevelopmentOrigin = env_1.env.NODE_ENV === 'development' &&
            /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');
        if (!origin || env_1.corsOrigins.includes(origin) || isLocalDevelopmentOrigin) {
            callback(null, true);
            return;
        }
        callback(new Error('CORS origin not allowed'));
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
// Express 5 exposes req.query as a getter-only property. Sanitize the
// existing request objects in place instead of assigning them back.
app.use((req, _res, next) => {
    [req.body, req.params, req.headers, req.query].forEach((target) => {
        if (target && typeof target === 'object') {
            express_mongo_sanitize_1.default.sanitize(target);
        }
    });
    next();
});
app.use((0, morgan_1.default)('combined'));
app.use('/api/v1/auth', (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.get('/health', (_req, res) => {
    const databaseConnected = (0, database_1.isDatabaseConnected)();
    res.status(databaseConnected ? 200 : 503).json({
        success: databaseConnected,
        message: databaseConnected ? 'Legal Case MIS API is healthy' : 'Database is unavailable',
        database: databaseConnected ? 'connected' : 'disconnected'
    });
});
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.openApiDocument));
app.get('/api-docs.json', (_req, res) => res.json(swagger_1.openApiDocument));
app.use('/api/v1', routes_1.default);
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
