# ChugLi Backend API Documentation

## Overview
ChugLi is a location-based real-time chat application with system-generated and user-created rooms. This document describes all available APIs and their usage.

**Base URL:** `http://localhost:4000` (Development)

---

## Table of Contents
1. [Health & Status APIs](#health--status-apis)
2. [System Room APIs](#system-room-apis)
3. [User Room APIs](#user-room-apis)
4. [Maintenance APIs](#maintenance-apis)
5. [WebSocket Events](#websocket-events)

---

## Health & Status APIs

### 1. Health Check
**Endpoint:** `GET /health`

**Description:** Check if the backend server is running and healthy.

**Response:**
```json
{
  "status": "ok",
  "app": "chugLi backed"
}
```

### 2. Root Endpoint
**Endpoint:** `GET /`

**Description:** Welcome message from the API.

**Response:**
```
Hello World!
```

---

## System Room APIs

System rooms are predefined categories (University, College, School, Hospital, etc.) that are automatically created based on user location.

### 1. Discover System Rooms
**Endpoint:** `GET /rooms/discover`

**Description:** Discover all available system rooms for user's location. Auto-creates rooms that don't exist within radius.

**Query Parameters:**
- `lat` (required): Latitude (e.g., `28.6139`)
- `lng` (required): Longitude (e.g., `77.2090`)
- `city` (optional): City name (e.g., `Delhi`)

**Example Request:**
```
GET /rooms/discover?lat=28.6139&lng=77.2090&city=Delhi
```

**Expected Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "University",
    "type": "system",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "city": "Delhi",
    "isActive": true,
    "activeUserCount": 12,
    "createdAt": "2026-01-15T10:30:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "College",
    "type": "system",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "city": "Delhi",
    "isActive": true,
    "activeUserCount": 8,
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
]
```

### 2. Get Nearby Rooms
**Endpoint:** `GET /rooms/nearby`

**Description:** Find all rooms (both system and user rooms) near a specific location.

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude

**Example Request:**
```
GET /rooms/nearby?lat=28.6139&lng=77.2090
```

**Expected Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "University",
    "type": "system",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "distance": 0.05,
    "activeUserCount": 12
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "title": "Study Group",
    "type": "user",
    "latitude": 28.6145,
    "longitude": 77.2095,
    "distance": 0.08,
    "activeUserCount": 5,
    "createdBy": "user123"
  }
]
```

### 3. Get Nearby Active User Count
**Endpoint:** `GET /rooms/nearby/count`

**Description:** Get the total count of active users in all rooms near a location.

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude

**Example Request:**
```
GET /rooms/nearby/count?lat=28.6139&lng=77.2090
```

**Expected Response:**
```json
{
  "totalActiveUsers": 45,
  "latitude": 28.6139,
  "longitude": 77.2090
}
```

### 4. Get Room Details
**Endpoint:** `GET /rooms/:roomId`

**Description:** Get detailed information about a specific room by its ID.

**Query Parameters:**
- `roomId` (required): UUID of the room

**Example Request:**
```
GET /rooms/550e8400-e29b-41d4-a716-446655440000?roomId=550e8400-e29b-41d4-a716-446655440000
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "University",
  "type": "system",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "city": "Delhi",
  "isActive": true,
  "activeUserCount": 12,
  "createdAt": "2026-01-15T10:30:00.000Z",
  "lastActivityAt": "2026-01-15T12:45:00.000Z"
}
```

### 5. Create System Room (Legacy)
**Endpoint:** `POST /rooms`

**Description:** Create a new system room with predefined categories. *Note: Prefer using `/rooms/discover` endpoint.*

**Request Body:**
```json
{
  "name": "College",
  "lat": 28.6139,
  "lng": 77.2090
}
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "name": "College",
  "type": "system",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "isActive": true,
  "createdAt": "2026-01-15T10:35:00.000Z"
}
```

---

## User Room APIs

User rooms are custom rooms created by users with their own titles. Maximum 5 user rooms allowed per area. Rooms expire after 24 hours of inactivity.

### 1. Create User Room
**Endpoint:** `POST /rooms/user`

**Description:** Create a user-generated room with custom title.

**Request Body:**
```json
{
  "title": "Study Group - CS101",
  "lat": 28.6139,
  "lng": 77.2090,
  "createdBy": "user123"
}
```

**Expected Response (Success):**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440010",
  "title": "Study Group - CS101",
  "type": "user",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "createdBy": "user123",
  "isActive": true,
  "expiresAt": "2026-01-16T12:00:00.000Z",
  "createdAt": "2026-01-15T12:00:00.000Z"
}
```

**Expected Response (Error - Limit Reached):**
```json
{
  "statusCode": 400,
  "message": "Maximum limit of 5 user rooms reached in this area",
  "error": "Bad Request"
}
```

### 2. Get User Rooms
**Endpoint:** `GET /rooms/user`

**Description:** Get all user-created rooms in a specific area.

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude

**Example Request:**
```
GET /rooms/user?lat=28.6139&lng=77.2090
```

**Expected Response:**
```json
[
  {
    "id": "650e8400-e29b-41d4-a716-446655440010",
    "title": "Study Group - CS101",
    "type": "user",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "createdBy": "user123",
    "activeUserCount": 8,
    "expiresAt": "2026-01-16T12:00:00.000Z",
    "createdAt": "2026-01-15T12:00:00.000Z"
  },
  {
    "id": "650e8400-e29b-41d4-a716-446655440011",
    "title": "Movie Discussion",
    "type": "user",
    "latitude": 28.6140,
    "longitude": 77.2091,
    "createdBy": "user456",
    "activeUserCount": 3,
    "expiresAt": "2026-01-16T10:30:00.000Z",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
]
```

### 3. Check Available User Room Slots
**Endpoint:** `GET /rooms/user/slots`

**Description:** Check how many user room slots are available in an area (max 5 per area).

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude

**Example Request:**
```
GET /rooms/user/slots?lat=28.6139&lng=77.2090
```

**Expected Response:**
```json
{
  "totalSlots": 5,
  "usedSlots": 2,
  "availableSlots": 3,
  "canCreateRoom": true
}
```

---

## Maintenance APIs

### Cleanup Expired Rooms
**Endpoint:** `POST /rooms/cleanup`

**Description:** Manually trigger cleanup of expired user rooms (rooms inactive for 24+ hours). This can also be scheduled automatically.

**Example Request:**
```
POST /rooms/cleanup
```

**Expected Response:**
```json
{
  "message": "Cleanup completed",
  "deletedRooms": 3,
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

---

## WebSocket Events

ChugLi uses Socket.IO for real-time chat functionality.

**Connection URL:** `ws://localhost:4000` or `wss://your-domain.com`

### Client Events (Emit)

#### 1. join-room
**Description:** Join a chat room

**Payload:**
```json
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "username": "JohnDoe"
}
```

**Response:** Room join confirmation

---

#### 2. leave-room
**Description:** Leave a chat room

**Payload:**
```json
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123"
}
```

**Response:** Room leave confirmation

---

#### 3. send-message
**Description:** Send a message to the room

**Payload:**
```json
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "message": "Hello everyone!"
}
```

**Broadcast:** All users in the room receive the message

---

### Server Events (Listen)

#### 1. message
**Description:** Receive messages from other users

**Payload:**
```json
{
  "userId": "user123",
  "username": "JohnDoe",
  "message": "Hello!",
  "timestamp": "2026-01-15T12:00:00.000Z"
}
```

---

#### 2. user-joined
**Description:** Notification when a user joins the room

**Payload:**
```json
{
  "userId": "user456",
  "username": "JaneDoe",
  "activeUsers": 5
}
```

---

#### 3. user-left
**Description:** Notification when a user leaves the room

**Payload:**
```json
{
  "userId": "user456",
  "activeUsers": 4
}
```

---

## WebSocket Example (JavaScript)

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:4000');

// Join room
socket.emit('join-room', {
  roomId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user123',
  username: 'JohnDoe'
});

// Send message
socket.emit('send-message', {
  roomId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user123',
  message: 'Hello everyone!'
});

// Listen for messages
socket.on('message', (data) => {
  console.log(`${data.username}: ${data.message}`);
});

// Listen for user joined
socket.on('user-joined', (data) => {
  console.log(`${data.username} joined. Active users: ${data.activeUsers}`);
});

// Listen for user left
socket.on('user-left', (data) => {
  console.log(`User left. Active users: ${data.activeUsers}`);
});

// Leave room
socket.emit('leave-room', {
  roomId: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user123'
});
```

---

## Quick Start Guide

### 1. Import Postman Collection
1. Open Postman
2. Click **Import** button
3. Select `ChugLi-API-Collection.postman_collection.json`
4. The collection will be imported with all endpoints and example responses

### 2. Set Base URL
The collection includes a variable `{{base_url}}` set to `http://localhost:4000`. Update it if your server runs on a different URL.

### 3. Test Workflow
1. **Check Health:** Start with `GET /health`
2. **Discover Rooms:** Use `GET /rooms/discover` with your coordinates
3. **Create User Room:** Use `POST /rooms/user` to create a custom room
4. **Check Slots:** Use `GET /rooms/user/slots` to see available slots
5. **WebSocket:** Use a WebSocket client to test real-time chat

---

## API Summary

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Health | `/health` | GET | Health check |
| Health | `/` | GET | Welcome message |
| System Rooms | `/rooms/discover` | GET | Discover system rooms |
| System Rooms | `/rooms/nearby` | GET | Get nearby rooms |
| System Rooms | `/rooms/nearby/count` | GET | Get active user count |
| System Rooms | `/rooms/:roomId` | GET | Get room details |
| System Rooms | `/rooms` | POST | Create system room (legacy) |
| User Rooms | `/rooms/user` | POST | Create user room |
| User Rooms | `/rooms/user` | GET | Get user rooms |
| User Rooms | `/rooms/user/slots` | GET | Check available slots |
| Maintenance | `/rooms/cleanup` | POST | Cleanup expired rooms |
| WebSocket | `ws://localhost:4000` | WS | Real-time chat |

---

## Notes

- **User Rooms:** Limited to 5 per area, expire after 24 hours of inactivity
- **System Rooms:** Auto-created based on location, permanent
- **WebSocket:** Use Socket.IO client for real-time features
- **Coordinates:** Use real latitude/longitude values (e.g., Delhi: 28.6139, 77.2090)
- **Anonymous Names:** System generates anonymous names for users who don't provide usernames

---

## Support
For issues or questions, refer to the repository documentation or contact the development team.
