import { Express } from 'express';
import request from 'supertest';
import User, { UserType } from '../model/userModel';
import mongoose from 'mongoose';
import { CommentType } from '../model/commentModel';
import { PostType } from '../model/postModel';

type UserData = {
  email: string;
  password: string;
  username: string;
  _id?: string;
  token?: string;
  refreshTokens?: string;
};

export const userData: UserData = {
  email: 'test@test.com',
  username: 'testUser',
  password: 'testPassword',
};

export const registerUser = async (app: Express, user: UserData, cleanup = false) => {
  if (cleanup) {
    await User.deleteMany({ email: user.email });
  }

  const res = await request(app).post('/auth/register').send(user);
  user.token = res.body.token;

  return res;
};

export const secondUser: UserData = {
  email: 'seconduser@test.com',
  password: '123456',
  username: 'SecondUser',
};

export const registerTestUser = (app: Express) => registerUser(app, userData, true);

export const registerOtherTestUser = (app: Express) => registerUser(app, secondUser);

export type PostData = {
  _id: mongoose.Types.ObjectId;
  title: string;
  mapLink: string;
  price: number;
  numberOfDays: number;
  location: {
    city?: string;
    country: string;
  };
  description: string;
  photos: string[];
};

export const postsList: PostData[] = [
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Amazing Trip to Paris',
    mapLink: 'https://www.google.com/maps/place/Paris,+France',
    price: 2500,
    numberOfDays: 7,
    location: {
      city: 'Paris',
      country: 'France',
    },
    description:
      'A wonderful week exploring the City of Light, visiting the Eiffel Tower, Louvre, and charming cafes.',
    photos: ['paris-eiffel.jpg', 'paris-louvre.jpg'],
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Tokyo Adventure',
    mapLink: 'https://www.google.com/maps/place/Tokyo,+Japan',
    price: 3500,
    numberOfDays: 10,
    location: {
      city: 'Tokyo',
      country: 'Japan',
    },
    description:
      'An unforgettable journey through modern Tokyo and traditional temples, amazing food and culture.',
    photos: ['tokyo-shibuya.jpg', 'tokyo-temple.jpg', 'tokyo-food.jpg'],
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'New York City Weekend',
    mapLink: 'https://www.google.com/maps/place/New+York,+NY,+USA',
    price: 1800,
    numberOfDays: 3,
    location: {
      city: 'New York',
      country: 'USA',
    },
    description:
      'A quick weekend getaway to the Big Apple - Broadway shows, Central Park, and iconic skyline views.',
    photos: ['nyc-skyline.jpg'],
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Safari in Kenya',
    mapLink: 'https://www.google.com/maps/place/Kenya',
    price: 4500,
    numberOfDays: 14,
    location: {
      country: 'Kenya',
    },
    description:
      'An incredible wildlife safari experience in Maasai Mara, witnessing the great migration.',
    photos: ['kenya-safari1.jpg', 'kenya-safari2.jpg', 'kenya-wildlife.jpg'],
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Beach Vacation in Bali',
    mapLink: 'https://www.google.com/maps/place/Bali,+Indonesia',
    price: 2000,
    numberOfDays: 10,
    location: {
      city: 'Bali',
      country: 'Indonesia',
    },
    description:
      'Relaxing beach vacation with stunning temples, rice terraces, and incredible sunsets.',
    photos: ['bali-beach.jpg', 'bali-temple.jpg'],
  },
];

export type CommentData = {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  text: string;
  user?: string;
};

export const createCommentsData = (postIds: mongoose.Types.ObjectId[]): CommentData[] => [
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[0],
    text: 'Paris looks absolutely stunning! Great trip idea.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[0],
    text: 'The Eiffel Tower visit alone makes this worth it.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[0],
    text: 'Love the mix of culture, food, and sightseeing.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[1],
    text: 'Tokyo is an incredible city — amazing choice!',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[1],
    text: 'The food scene in Tokyo is unbeatable.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[1],
    text: 'I like how you included both modern and traditional spots.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[2],
    text: 'Perfect weekend itinerary for NYC.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[2],
    text: 'Broadway and Central Park never disappoint.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[3],
    text: 'A safari in Kenya sounds like a once-in-a-lifetime experience.',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    post: postIds[3],
    text: 'The wildlife photos must be incredible.',
  },
];

/*The normalization functions convert the Mongoose document to a plain object
 and extract only relevant fields for comparison in tests.*/
export const normalizePost = (post: PostType & { _id: string }) => ({
  _id: post._id,
  sender: post.sender._id,
  title: post.title,
  mapLink: post.mapLink,
  price: post.price,
  numberOfDays: post.numberOfDays,
  location: {
    city: post.location?.city,
    country: post.location?.country,
  },
  description: post.description,
  photos: post.photos,
});

export const normalizeComment = (comment: CommentType & { _id: string }) => ({
  _id: comment._id,
  post: comment.post,
  text: comment.text,
});

export const normalizeUser = (user: UserType & { _id: string }) => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  profilePicture: user.profilePicture || null,
});
