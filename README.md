 
# Daily News Dashboard - Backend API

A comprehensive Node.js backend API for a news platform featuring role-based access control, content management, advertisement system, and advanced analytics.

## 🚀 Features

### Core Features
- **Role-based Authentication** (USER, EDITOR, AD_MANAGER, ADMIN)
- **Content Management System** with approval workflow
- **Advanced Search** with filters and suggestions  
- **Advertisement Management** with analytics
- **User Favorites** and reading history
- **Real-time Analytics** and reporting
- **File Upload** with validation and management
- **Comprehensive Admin Panel** features

### Advanced Features
- JWT token-based authentication with refresh tokens
- Advanced search with relevance scoring
- Reading progress tracking
- Social sharing integration
- Bulk operations for efficient management
- System health monitoring
- Automated cleanup tasks
- Export functionality

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL with Prisma ORM
- **Authentication**: JWT + bcryptjs
- **File Upload**: Multer
- **Logging**: Winston
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js 16.x or higher
- MySQL 8.0 or higher
- npm or yarn

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd daily-news-backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/daily_news_db"

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 🔐 Default User Accounts

After seeding, you can use these accounts:

| Role | Email | Password |
|------|--------|----------|
| Admin | admin@dailynews.com | admin123! |
| AD Manager | admanager@dailynews.com | manager123! |
| Editor | editor@dailynews.com | editor123! |
| User | user@dailynews.com | user123! |

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "role": "USER"
}
```

#### POST /api/auth/login
User login
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### POST /api/auth/refresh
Refresh access token
```json
{
  "refreshToken": "your_refresh_token_here"
}
```

### Article Management

#### GET /api/articles
Get published articles (public)
- Query params: `page`, `limit`, `category`, `sortBy`, `order`, `featured`

#### POST /api/articles
Create new article (EDITOR, AD_MANAGER, ADMIN)
```json
{
  "headline": "Article Title",
  "briefContent": "Brief description",
  "fullContent": "Full article content",
  "category": "TECHNOLOGY",
  "tags": "tech, news",
  "priorityLevel": 5
}
```

#### PUT /api/articles/:id
Update article

#### DELETE /api/articles/:id
Delete article

#### POST /api/articles/:id/approval
Approve/reject article (AD_MANAGER, ADMIN)
```json
{
  "action": "APPROVED",
  "comments": "Article looks good"
}
```

### Search Endpoints

#### GET /api/search
Search articles
- Query params: `q`, `category`, `page`, `limit`, `sortBy`, `order`

#### GET /api/search/suggestions
Get search suggestions
- Query params: `q`, `limit`

#### POST /api/search/advanced
Advanced search with multiple filters
```json
{
  "query": "technology",
  "categories": ["TECHNOLOGY", "BUSINESS"],
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "tags": ["AI", "innovation"]
}
```

### User Management

#### GET /api/users/profile
Get current user profile

#### PUT /api/users/profile
Update user profile
```json
{
  "fullName": "Updated Name",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

#### GET /api/users/dashboard
Get user dashboard statistics

### Favorites Management

#### GET /api/favorites
Get user's favorite articles

#### POST /api/favorites/:articleId
Add article to favorites

#### DELETE /api/favorites/:articleId
Remove from favorites

#### POST /api/favorites/bulk
Bulk add/remove favorites
```json
{
  "articleIds": ["id1", "id2", "id3"],
  "action": "add"
}
```

### Advertisement Management

#### GET /api/advertisements/active
Get active advertisements for display
- Query params: `position`, `limit`

#### POST /api/advertisements/:id/click
Track advertisement click

#### GET /api/advertisements (AD_MANAGER, ADMIN)
Get all advertisements

#### POST /api/advertisements (AD_MANAGER, ADMIN)
Create new advertisement
```json
{
  "title": "Ad Title",
  "content": "Ad description",
  "targetUrl": "https://example.com",
  "position": "BANNER",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "budget": 1000.00
}
```

### Analytics (AD_MANAGER, ADMIN)

#### GET /api/analytics/overview
Platform overview analytics

#### GET /api/analytics/content
Content performance analytics

#### GET /api/analytics/users (ADMIN)
User analytics

#### GET /api/analytics/engagement
User engagement analytics

#### GET /api/analytics/realtime
Real-time analytics

### Admin Functions (ADMIN Only)

#### GET /api/admin/stats
Platform statistics

#### GET /api/admin/health
System health check

#### GET /api/admin/settings
Get system settings

#### PUT /api/admin/settings/:key
Update system setting

#### POST /api/admin/cleanup/tokens
Cleanup expired tokens

#### POST /api/admin/users/bulk
Bulk user management

### File Upload

#### POST /api/upload/image (EDITOR, AD_MANAGER, ADMIN)
Upload single image

#### POST /api/upload/images (EDITOR, AD_MANAGER, ADMIN)
Upload multiple images

#### GET /api/upload/files (EDITOR, AD_MANAGER, ADMIN)
List uploaded files

#### DELETE /api/upload/:filename (EDITOR, AD_MANAGER, ADMIN)
Delete uploaded file

## 🔒 Security Features

- **JWT Authentication** with access and refresh tokens
- **Rate Limiting** to prevent abuse
- **Input Validation** on all endpoints
- **SQL Injection Protection** via Prisma
- **CORS Configuration** for cross-origin requests
- **Helmet** for security headers
- **File Upload Validation** with type and size limits

## 📊 Database Schema

The system uses MySQL with the following main entities:

- **Users** - User accounts with role-based permissions
- **NewsArticles** - Articles with approval workflow
- **UserFavorites** - User favorite articles
- **Advertisements** - Advertisement campaigns
- **SearchHistory** - User search tracking
- **ReadingHistory** - Reading progress tracking
- **ApprovalHistory** - Article approval audit trail
- **RefreshTokens** - JWT refresh token management
- **SystemSettings** - Application configuration

## 🚀 Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start ecosystem.config.js

# View logs
pm2 logs daily-news-backend

# Monitor
pm2 monit
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL="mysql://username:password@localhost:3306/daily_news_db"
JWT_SECRET=your_production_jwt_secret
JWT_REFRESH_SECRET=your_production_refresh_secret
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Changelog

### Version 1.0.0
- Initial release with core functionality
- Role-based authentication system
- Content management with approval workflow
- Advanced search capabilities
- Advertisement management system
- Analytics and reporting features
- File upload functionality
- Admin panel features

## 🐛 Known Issues

- File thumbnails require additional image processing library
- Real-time notifications not implemented
- Advanced analytics export needs enhancement

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💡 Support

For support, please email support@dailynews.com or create an issue in the repository.

---

**Made with ❤️ for the Daily News Platform**



Login Credentials:
   Admin: admin@newsplatform.com / password123
   AD Manager: admanager@newsplatform.com / password123
   Editor: editor1@newsplatform.com / password123
   User: user1@example.com / password123