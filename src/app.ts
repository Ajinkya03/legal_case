import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { openApiDocument } from './config/swagger';
import { isDatabaseConnected } from './config/database';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Express 5 exposes req.query as a getter-only property. Sanitize the
// existing request objects in place instead of assigning them back.
app.use((req, _res, next) => {
	[req.body, req.params, req.headers, req.query].forEach((target) => {
		if (target && typeof target === 'object') {
			mongoSanitize.sanitize(target as Record<string, unknown>);
		}
	});
	next();
});
app.use(morgan('combined'));
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.get('/health', (_req, res) => {
	const databaseConnected = isDatabaseConnected();
	res.status(databaseConnected ? 200 : 503).json({
		success: databaseConnected,
		message: databaseConnected ? 'Legal Case MIS API is healthy' : 'Database is unavailable',
		database: databaseConnected ? 'connected' : 'disconnected'
	});
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get('/api-docs.json', (_req, res) => res.json(openApiDocument));
app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;