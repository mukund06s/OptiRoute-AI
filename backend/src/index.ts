import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes will be mounted in Phase 2

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`OptiRoute backend running on port ${PORT}`);
});

export default app;
