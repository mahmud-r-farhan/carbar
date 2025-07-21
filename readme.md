# CarBar - Beta

**CarBar** is a ride-sharing platform designed to connect passengers with captains (drivers) for convenient, safe, and reliable transportation. The platform offers seamless ride booking, real-time trip tracking, driver management, and customer support through an intuitive user interface. Currently in **beta**, CarBar is under active development, and we welcome contributions and feedback from the community.

---

## Features
- **Ride Booking**: Users can book rides with ease, specifying pickup and drop-off locations.
- **Real-Time Tracking**: Track your ride in real-time with live updates on the driver's location.
- **Driver Management**: Captains can manage their availability, trips, and earnings.
- **Secure Authentication**: JWT-based authentication ensures secure access for users and drivers.
- **Notifications**: Push notifications powered by VAPID for real-time updates.
- **Customer Support**: In-app support for addressing user queries and issues.
- **Scalable Backend**: Built with MongoDB, Redis, and WebSocket for efficient data handling and real-time communication.

---

## Tech Stack
- **Frontend**: 
  - Framework: [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
  - Styling: [Tailwind CSS](https://tailwindcss.com/)
  - Image Handling: [Cloudinary](https://cloudinary.com/)
- **Backend**: 
  - Framework: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
  - Database: [MongoDB](https://www.mongodb.com/)
  - Caching: [Redis](https://redis.io/)
  - Authentication: JWT
  - WebSocket: Real-time communication for ride updates
- **Deployment**: 
  - Hosting: [Render](https://render.com/) for backend, [Vercel](https://vercel.com/) for frontend
  - Email Service: Configurable SMTP (e.g., SendGrid, Gmail)
- **Other Tools**: 
  - Rate Limiting: To prevent abuse
  - Environment Management: `.env` files for configuration

---

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (local or cloud instance)
- [Redis](https://redis.io/) (local or cloud instance)
- [Git](https://git-scm.com/) for cloning the repository
- A [Cloudinary](https://cloudinary.com/) account for image uploads
- An SMTP service (e.g., SendGrid, Gmail) for email notifications
- [VAPID keys](https://web.dev/push-notifications/) for push notifications

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mahmud-r-farhan/carbar
   cd carbar
   ```

2. **Set Up Environment Variables**:
   - **Backend**: Create a `backend/.env` file with the following configuration:
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
     PORT=$PORT # Provided by Render
     REDIS_URL=redis://red-xxx:6379 # Provided by Render’s Redis instance
     WS_BASE_URL=wss://your-app.onrender.com
     WS_PATH=/websocket
     RATE_LIMIT_WINDOW_MS=900000
     RATE_LIMIT_MAX=100
     ```
   - **Frontend**: Create a `frontend/.env` file with the following configuration:
     ```env
     VITE_API_URL=https://your-app.onrender.com
     VITE_WS_SERVER_URL=wss://your-app.onrender.com
     VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
     VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
     ```

3. **Install Dependencies**:
   - For the backend:
     ```bash
     cd backend
     npm install
     ```
   - For the frontend:
     ```bash
     cd frontend
     npm install
     ```

4. **Run the Backend**:
   ```bash
   cd backend
   npm run start
   ```

5. **Run the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the Application**:
   - Frontend: Open `http://localhost:5173` (or the port specified by Vite) in your browser.
   - Backend: The API will be available at `http://localhost:3000` (or the port specified in `backend/.env`).

---

## Project Structure
```
carbar/
├── backend/                # Node.js/Express backend/Backend source code
│   ├── .env                # Backend environment variables
│   ├── server.js           # Server
│   └── package.json        # Backend dependencies
├── frontend/               # React/Vite frontend
│   ├── .env                # Frontend environment variables
│   ├── src/                # Frontend source code
│   └── package.json        # Frontend dependencies
├── README.md               # Project documentation
└── .gitignore              # Git ignore file
```

---

## Contributing
CarBar is under active development, and contributions are welcome! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make your changes and commit (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request on the [GitHub repository](https://github.com/mahmud-r-farhan/carbar).

Please ensure your code follows the project's coding standards and includes relevant tests.

---

## Known Issues
- **Beta Limitations**: Some features (e.g., payment integration, advanced driver analytics system) are still in development.
- **WebSocket Stability**: Occasional disconnections may occur in certain network conditions.
- **Mobile Responsiveness**: Some UI elements may not be fully optimized for all devices.

Report issues or suggest improvements on the [GitHub Issues page](https://github.com/mahmud-r-farhan/carbar/issues).

---

## License
This project is licensed under the [MIT License](LICENSE).

---

## Contact
For questions or feedback, reach out via the [GitHub repository](https://github.com/mahmud-r-farhan/carbar) or contact the maintainer at [dev@devplus.fun](mailto:dev@devplus.fun).

---
<h3 style="color:red">Under Active Development - Beta Version</h3>

> ©[Mahmud Rahman](https://mahmudr.vercel.app/)