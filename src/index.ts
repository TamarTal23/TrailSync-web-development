import express, { Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import cors from 'cors';
import postRoutes from './routes/postRoutes';
import userRoutes from './routes/userRoutes';
import commentRoutes from './routes/commentRoutes';
import authRoutes from './routes/authRoutes';
import mongoose from 'mongoose';
import { setupSwagger } from './swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.PORT || 433;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

setupSwagger(app);

app.get('/', (_req: Request, res: Response) => {
  res.send('Server running');
});

app.use('/post', postRoutes);
app.use('/auth', authRoutes);
app.use('/comment', commentRoutes);
app.use('/user', userRoutes);

export const initApp = async () => {
  const db = mongoose.connection;
  db.on('error', (error) => console.error(error));

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/TrailSync', {});
  console.log('Connected to Database');

  return app;
};

if (process.env.NODE_ENV !== 'production') {
  console.log('development');
  http.createServer(app).listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });
} else {
  console.log('PRODUCTION');
  const options2 = {
    key: fs.readFileSync('../../client-key.pem'),
    cert: fs.readFileSync('../../client-cert.pem'),
  };
  https.createServer(options2, app).listen(HTTPS_PORT, () => {
    console.log(`HTTPS server running on port ${HTTPS_PORT}`);
  });
}
