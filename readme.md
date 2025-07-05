# CarBar

## Overview
**CarBar** is a ride-sharing platform that connects users (passengers) with captains (drivers) to facilitate convenient, safe, and reliable transportation. It offers easy ride booking, trip tracking, driver management, and customer support in a user-friendly interface.


-------

## Setup & Installation

1.  Clone the repository.
    
2.  Create a `.env` file with the following variables:
    

```env
DB_CONNECT=
JWT_SECRET=your_another_long_random_jwt_secret_here
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

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

------
