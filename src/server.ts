import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(env.PORT, () => console.log(`Legal Case MIS API listening on port ${env.PORT}`));
}

start().catch((error: unknown) => {
  console.error('Failed to connect to MongoDB. Check MONGO_URI and MongoDB Atlas network access.', error);
  process.exit(1);
});