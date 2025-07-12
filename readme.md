# CarBar - Beta

## Overview
**CarBar** is a ride-sharing platform that connects users (passengers) with captains (drivers) to facilitate convenient, safe, and reliable transportation. It offers easy ride booking, trip tracking, driver management, and customer support in a user-friendly interface.


-------

## Setup & Installation

1.  Clone the repository.
    
2.  Create a `backend/.env` file with the following variables:
    

```env
DB_CONNECT=mongodb://<your-mongo-uri>
JWT_SECRET=your_jwt_secret
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
ALLOWED_ORIGINS=https://carbar-pi.vercel.app,https://your-app.onrender.com
PORT=$PORT # Render provides this automatically
REDIS_URL=redis://red-xxx:6379 # Provided by Render’s Redis instance
WS_BASE_URL=wss://your-app.onrender.com
WS_PATH=/websocket
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

```

and create another `frontend/.env` file with the following variables:

```env
VITE_API_URL=
VITE_WS_SERVER_URL=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=

```

3.  Install dependencies:
    

```bash
npm install

```

4.  Run the backend server:
    

```bash
npm run start

```

5.  Run the frontend:
    

```bash
npm run dev

```


## Under-Development
