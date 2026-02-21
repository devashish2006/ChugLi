# ChugLi Backend 🚀

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
</p>

## 📖 About

ChugLi Backend is a **location-based anonymous chat platform** built with NestJS. It enables users to discover and join themed chat rooms based on their geographic location, creating hyper-local communities for authentic conversations.

### Key Features

✨ **Real-time Communication**
- WebSocket-based chat using Socket.IO
- Live message delivery with typing indicators
- Automatic user presence tracking
- Real-time room user counts

🗺️ **Location-Based Rooms**
- Discover nearby chat rooms within 5km radius
- PostGIS spatial queries for precise location matching
- System rooms auto-created per area
- User-created custom rooms (max 2 per area)

🎭 **Anonymous & Secure**
- Google OAuth authentication
- Anonymous chat identities with generated names
- JWT-based secure WebSocket connections
- User tracking for moderation while preserving anonymity

🛡️ **Moderation & Safety**
- Content moderation system
- User ban system with auto-unban (24 hours)
- Violation tracking
- Slow mode for spam prevention
- Message rate limiting

📊 **Admin Analytics**
- Comprehensive dashboard with real-time metrics
- User engagement tracking
- Room popularity statistics
- Message activity monitoring
- Hourly activity patterns

🏠 **Themed System Rooms**
- **Confession Room**: Anonymous emotional confessions
- **Your City**: City-level discussions and pride
- **Hostel Masti**: College/hostel life chaos
- **Exam/Result Room**: Academic stress support
- **Late Night Thoughts**: Deep talks (11 PM - 2 AM)
- **Morning Thoughts**: Morning reflections (6 AM - 9 AM)
- **Match Day Live**: Live sports reactions

## 🏗️ Architecture

```
chugli-backend/
├── src/
│   ├── analytics/          # Admin analytics & metrics
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── analytics.module.ts
│   ├── auth/              # Authentication & authorization
│   │   ├── strategies/    # Google OAuth & JWT strategies
│   │   ├── guards/        # Auth & Admin guards
│   │   ├── auth.service.ts
│   │   └── auth.controller.ts
│   ├── chat/              # WebSocket chat gateway
│   │   ├── chat.gateway.ts
│   │   └── chat.module.ts
│   ├── rooms/             # Room management
│   │   ├── rooms.service.ts
│   │   ├── rooms.controller.ts
│   │   ├── room-types.config.ts
│   │   └── room-cleanup.service.ts
│   ├── db/                # Database schema & connection
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   ├── anonymous-name.ts
│   │   └── content-moderation.ts
│   └── main.ts            # Application entry point
├── drizzle/               # Database migrations
└── package.json
```

## 🛠️ Tech Stack

- **Framework**: NestJS 11.x
- **WebSocket**: Socket.IO 4.x
- **Database**: PostgreSQL with PostGIS extension
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js (Google OAuth, JWT)
- **Validation**: Class-validator
- **Scheduling**: NestJS Schedule (cron jobs)

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14+ with PostGIS extension
- Google OAuth credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/devashish2006/ChugLi.git
cd ChugLi/chugli-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chugli

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Server
PORT=4000
```

4. **Enable PostGIS extension**
```bash
node enable-postgis.js
```

5. **Run database migrations**
```bash
npm run db:push
```

6. **Start the development server**
```bash
npm run start:dev
```

The server will be running at `http://localhost:4000`

## 📡 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `GET /auth/profile` - Get authenticated user profile

### Rooms
- `GET /rooms/discover` - Discover nearby system rooms
- `GET /rooms/nearby` - Get all nearby rooms (system + user)
- `GET /rooms/user` - Get user-created rooms in area
- `POST /rooms/user` - Create a new user room
- `DELETE /rooms/user/:roomId` - Delete user room
- `GET /rooms/:roomId` - Get room details
- `GET /rooms/:roomId/messages` - Get room message history
- `POST /rooms/cleanup` - Cleanup expired rooms

### Analytics (Admin Only)
- `GET /analytics/overview` - Platform overview statistics
- `GET /analytics/users?days=30` - User statistics
- `GET /analytics/rooms?days=30` - Room statistics
- `GET /analytics/messages?days=30` - Message statistics
- `GET /analytics/engagement` - Engagement metrics
- `GET /analytics/user-activity` - Recent user activity
- `GET /analytics/room-popularity` - Most popular rooms
- `GET /analytics/user-list` - Paginated user list
- `POST /analytics/ban-user/:userId` - Ban a user
- `POST /analytics/unban-user/:userId` - Unban a user
- `GET /analytics/banned-users` - List banned users
- `GET /analytics/recent-activity` - Recent messages
- `GET /analytics/online-users` - Currently online users

### Health
- `GET /health` - Health check endpoint

## 🔌 WebSocket Events

### Client → Server
- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send a message
- `typing` - Typing indicator

### Server → Client
- `message` - New message received
- `user-joined` - User joined the room
- `user-left` - User left the room
- `user-count` - Updated user count
- `your-identity` - User's anonymous identity
- `typing-indicator` - Someone is typing
- `room-closing` - Room is being closed
- `last-user-warning` - Room will expire if last user leaves
- `message-blocked` - Message blocked by moderation
- `user-banned` - User has been banned
- `slow-mode` - Slow mode activated

## 🗄️ Database Schema

### Tables
- **users**: User accounts (OAuth, profiles, ban status)
- **rooms**: Chat rooms (system & user-created)
- **messages**: Chat messages with user references

### Key Fields
- **Users**: id, email, name, avatar, banned, ban_reason, banned_at, violation_count
- **Rooms**: id, name, type, lat, lng, created_by, expires_at
- **Messages**: id, room_id, user_id, content, sender_name, timestamp

## 📊 Admin Panel Features

The admin panel (`mshubh612@gmail.com`) provides:

- **Real-time Metrics**: Active users, rooms, messages
- **User Analytics**: Registration trends, retention rates, activity
- **Room Analytics**: Room creation patterns, popularity rankings
- **Message Analytics**: Message volume, engagement metrics
- **User Management**: Ban/unban users, view violations
- **Activity Monitoring**: Recent messages, online users

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth for WebSocket
- **OAuth Integration**: Google OAuth for user verification
- **Content Moderation**: Automated content filtering
- **Rate Limiting**: Message rate limits per user
- **Spam Prevention**: Slow mode activation on detected spam
- **Ban System**: 24-hour temporary bans with auto-unban
- **Admin Guards**: Protected admin-only endpoints

## 🧪 Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📦 Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm run start:prod
```

### Environment Configuration
Ensure all production environment variables are set:
- Use secure JWT secrets
- Configure production database URL
- Set correct frontend URL for CORS
- Use production Google OAuth credentials

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the UNLICENSED License.

## 👥 Author

**Devashish**
- GitHub: [@devashish2006](https://github.com/devashish2006)
- Instagram: [@devashish_6363](https://www.instagram.com/devashish_6363)
- X (Twitter): [@devashish6363](https://x.com/devashish6363)

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Database powered by [PostgreSQL](https://www.postgresql.org/) & [PostGIS](https://postgis.net/)
- Real-time with [Socket.IO](https://socket.io/)
- ORM by [Drizzle](https://orm.drizzle.team/)

---

<p align="center">Made with ❤️ for local communities</p>
