const swaggerUi = require('swagger-ui-express');
const express = require('express');
const router = express.Router();
const { cleanEnv, str } = require('envalid');

// Load environment vars
const env = cleanEnv(process.env, {
  SWAGGER_BASE_URL: str({ default: 'http://localhost:3000' }),
  NODE_ENV: str({ default: 'development' }),
});

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'CarBar API',
    version: '1.0.0',
    description: 'API for CarBar ride-sharing platform',
  },
  servers: [
    {
      url: env.SWAGGER_BASE_URL,
      description: env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
    },
  ],
  paths: {
    // Push Notification endpoints
    '/vapid-public-key': {
      get: {
        summary: 'Get VAPID public key for push notifications',
        tags: ['Push Notifications'],
        responses: {
          '200': {
            description: 'VAPID public key',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    publicKey: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/subscribe': {
      post: {
        summary: 'Subscribe to push notifications',
        tags: ['Push Notifications'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  endpoint: { type: 'string' },
                  keys: {
                    type: 'object',
                    properties: {
                      p256dh: { type: 'string' },
                      auth: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Subscription saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/send-notification': {
      post: {
        summary: 'Send push notification (admin only)',
        tags: ['Push Notifications'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Notification results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean' },
                          error: { type: 'string', nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // User endpoints
    '/user/register': {
      post: {
        summary: 'Register a new user',
        tags: ['User'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullname: {
                    type: 'object',
                    properties: {
                      firstname: { type: 'string' },
                      lastname: { type: 'string' },
                    },
                    required: ['firstname', 'lastname'],
                  },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
                required: ['fullname', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'OTP sent to email' },
          '400': { description: 'Validation error or user exists' },
        },
      },
    },
    '/user/verify-otp': {
      post: {
        summary: 'Verify user OTP',
        tags: ['User'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  otp: { type: 'string', minLength: 6, maxLength: 6 },
                },
                required: ['userId', 'otp'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Account verified' },
          '400': { description: 'Invalid or expired OTP' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/user/login': {
      post: {
        summary: 'User login',
        tags: ['User'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials or unverified account' },
        },
      },
    },
    '/user/profile': {
      get: {
        summary: 'Get user profile',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/user/update-profile': {
      post: {
        summary: 'Update user profile',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullname: {
                    type: 'object',
                    properties: {
                      firstname: { type: 'string' },
                      lastname: { type: 'string' },
                    },
                  },
                  profileImage: { type: 'string', format: 'url' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'User not found' },
        },
      },
    },
    '/user/logout': {
      post: {
        summary: 'Logout user',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out successfully' },
          '400': { description: 'No token provided' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/user/rides': {
      get: {
        summary: 'Get user rides',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of user rides',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      from: { type: 'string' },
                      to: { type: 'string' },
                      date: { type: 'string', format: 'date' },
                      status: { type: 'string' },
                      cost: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/user/book-ride': {
      post: {
        summary: 'Book a ride',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  from: {
                    type: 'object',
                    properties: {
                      address: { type: 'string' },
                      coordinates: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' },
                        },
                      },
                    },
                  },
                  to: {
                    type: 'object',
                    properties: {
                      address: { type: 'string' },
                      coordinates: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number' },
                          lng: { type: 'number' },
                        },
                      },
                    },
                  },
                  type: { type: 'string', enum: ['ride', 'parcel'] },
                  proposedAmount: { type: 'number' },
                },
                required: ['from', 'to', 'type', 'proposedAmount'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Ride booked' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // Captain endpoints
    '/captain/register': {
      post: {
        summary: 'Register a new captain',
        tags: ['Captain'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullname: {
                    type: 'object',
                    properties: {
                      firstname: { type: 'string' },
                      lastname: { type: 'string' },
                    },
                    required: ['firstname', 'lastname'],
                  },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  vehicle: {
                    type: 'object',
                    properties: {
                      color: { type: 'string' },
                      plate: { type: 'string' },
                      capacity: { type: 'integer' },
                      vehicleType: {
                        type: 'string',
                        enum: ['car', 'motorcycle', 'auto', 'cng', 'bicycle'],
                      },
                    },
                    required: ['color', 'plate', 'capacity', 'vehicleType'],
                  },
                },
                required: ['fullname', 'email', 'password', 'vehicle'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'OTP sent to email' },
          '400': { description: 'Validation error or captain exists' },
        },
      },
    },
    '/captain/verify-otp': {
      post: {
        summary: 'Verify captain OTP',
        tags: ['Captain'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  captainId: { type: 'string' },
                  otp: { type: 'string', minLength: 6, maxLength: 6 },
                },
                required: ['captainId', 'otp'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Account verified' },
          '400': { description: 'Invalid or expired OTP' },
          '404': { description: 'Captain not found' },
        },
      },
    },
    '/captain/login': {
      post: {
        summary: 'Captain login',
        tags: ['Captain'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    captain: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials or unverified account' },
        },
      },
    },
    '/captain/profile': {
      get: {
        summary: 'Get captain profile',
        tags: ['Captain'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Captain profile',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/captain/update-profile': {
      post: {
        summary: 'Update captain profile',
        tags: ['Captain'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  fullname: {
                    type: 'object',
                    properties: {
                      firstname: { type: 'string' },
                      lastname: { type: 'string' },
                    },
                  },
                  profileImage: { type: 'string', format: 'url' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Profile updated' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Captain not found' },
        },
      },
    },
    '/captain/trips': {
      get: {
        summary: 'Get captain trips',
        tags: ['Captain'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of captain trips',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      passenger: { type: 'string' },
                      from: { type: 'string' },
                      to: { type: 'string' },
                      date: { type: 'string', format: 'date' },
                      status: { type: 'string' },
                      earnings: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/captain/logout': {
      get: {
        summary: 'Logout captain',
        tags: ['Captain'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

if (env.NODE_ENV !== 'production') {
  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

module.exports = router;