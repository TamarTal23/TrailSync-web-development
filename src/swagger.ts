import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TravelSync API',
      version: '1.0.0',
      description: 'API documentation for TravelSync - A travel sharing platform',
      contact: {
        name: 'TamarAndOfir',
        email: 'tamarandofir@gmail.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'username'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated mongo id',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password (hashed)',
            },
            username: {
              type: 'string',
              description: 'User username',
            },
            profilePicture: {
              type: 'string',
              description: 'Path to profile picture',
            },
            refreshTokens: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of refresh tokens',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Post: {
          type: 'object',
          required: [
            'title',
            'mapLink',
            'price',
            'numberOfDays',
            'location',
            'description',
            'photos',
          ],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated mongo id',
            },
            sender: {
              type: 'string',
              description: 'User Id of the post creator',
            },
            title: {
              type: 'string',
              description: 'Post title',
            },
            mapLink: {
              type: 'string',
              description: 'Google Maps link',
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Trip price',
            },
            numberOfDays: {
              type: 'number',
              description: 'Trip duration in days',
            },
            location: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: 'City name',
                },
                country: {
                  type: 'string',
                  description: 'Country name',
                },
              },
              required: ['country'],
            },
            description: {
              type: 'string',
              description: 'Trip description',
            },
            photos: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of photo paths',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Comment: {
          type: 'object',
          required: ['post', 'user', 'text'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated mongo id',
            },
            post: {
              type: 'string',
              description: 'Post id this comment belongs to',
            },
            user: {
              type: 'string',
              description: 'User id who created the comment',
            },
            text: {
              type: 'string',
              description: 'Comment text',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        AuthTokens: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'TrailSync',
    })
  );
  console.log(
    `Swagger documentation available at http://localhost:${process.env.PORT || 5000}/api-docs`
  );
};
