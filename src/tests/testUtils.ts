import { Express } from 'express';
import request from 'supertest';
import User from '../model/userModel';

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

export const registerTestUser = async (app: Express) => {
  await User.deleteMany({ email: userData.email });

  const res = await request(app).post('/auth/register').send(userData);

  userData._id = res.body._id;
  userData.token = res.body.token;
};

export type PostData = {
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

// export type CommentData = {
//   post: string;
//   user: string;
//   text: string;
// };

export const postsList: PostData[] = [
  {
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
