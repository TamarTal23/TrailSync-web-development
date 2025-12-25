import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db';
import postRoutes from './routes/postRoutes';

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.send('Server running');
});

app.use('/post', postRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
