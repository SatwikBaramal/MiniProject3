# Location-Based Attendance System

This is a web application that tracks attendance based on user location using React, Node.js, OpenStreetMap, and MongoDB.

## Features

- Real-time location tracking
- Visual map representation using OpenStreetMap
- Automatic attendance marking when within office premises
- MongoDB database for attendance records

## Prerequisites

- Node.js (v14 or higher)
- MongoDB installed and running locally
- Modern web browser with geolocation support

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. Configure office location:
   - Open `server/server.js`
   - Update the `officeLocation` object with your office's coordinates:
     ```javascript
     const officeLocation = {
       latitude: YOUR_OFFICE_LATITUDE,
       longitude: YOUR_OFFICE_LONGITUDE,
       radius: RADIUS_IN_METERS
     };
     ```

4. Start the application:
   ```bash
   # Start MongoDB (if not already running)
   mongod

   # In the root directory
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## How It Works

1. The application requests your location when you visit the website
2. Your position is displayed on the map along with the office premises
3. If you are within the specified office radius, your attendance will be marked
4. The attendance status is displayed on the screen

## Technologies Used

- Frontend: React, React-Leaflet
- Backend: Node.js, Express
- Database: MongoDB
- Map: OpenStreetMap
