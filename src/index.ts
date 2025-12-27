import express, { Request, Response, Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import postRoutes from './routes/postRoutes';
import userRoutes from './routes/userRoutes';
import commentRoutes from './routes/commentRoutes';
import authRoutes from './routes/authRoutes';
import mongoose from 'mongoose';

dotenv.config();
// connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

app.get('/', (_req: Request, res: Response) => {
  res.send('Server running');
});

app.use('/post', postRoutes);
app.use('/auth', authRoutes);
app.use('/comment', commentRoutes);
app.use('/user', userRoutes);

export const initApp = () => {
  const dbConnectionPromise = new Promise<Express>((resolve, _reject) => {
    mongoose
      .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/TrailSync', {})
      .then(() => {
        resolve(app);
      });

    const db = mongoose.connection;
    db.on('error', (error) => console.error(error));
    db.once('open', () => console.log('Connected to Database'));
  });

  return dbConnectionPromise;
};

initApp().then((app) =>
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  })
);
