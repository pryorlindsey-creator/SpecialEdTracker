# Special Education Data Collection Platform

A comprehensive, production-ready web application for special education teachers to track student progress, manage IEP goals, and generate meaningful reports.

## 🚀 Quick Start

The application can be started with a single command:

### Option 1: Python Command
```bash
python main.py
```

### Option 2: NPM Commands
```bash
npm install
npm run build
npm start
```

### Development Mode
```bash
npm run dev
```

## 📋 Production Deployment

For live website deployment, see:
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[SECURITY.md](SECURITY.md)** - Security configuration
- **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** - Pre-deployment verification

## ✨ Features

### Core Functionality
- **Student Management**: Track multiple students with grade-level organization
- **Goal Tracking**: Support for frequency, percentage, and duration data collection types
- **Real-time Data Collection**: Live collection tabs with timers and counters
- **Progress Visualization**: Multiple chart types (line, bar, pie) with dynamic switching
- **Comprehensive Reporting**: PDF exports with charts and detailed progress summaries
- **IEP Calendar**: Interactive calendar showing due dates and reporting periods
- **Admin Tools**: Database verification and management capabilities

### Production Features
- **Security**: User authentication, data isolation, secure sessions
- **Performance**: Optimized database queries, efficient caching
- **Scalability**: PostgreSQL backend, horizontal scaling ready
- **Reliability**: Error handling, data validation, backup systems
- **Compliance**: FERPA-ready data protection, audit logging

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: OpenID Connect (configurable)
- **Charts**: Recharts with multiple visualization types
- **PDF Generation**: jsPDF with chart integration

## 📊 Data Collection Types

1. **Frequency**: Count of behaviors or events
2. **Percentage**: Success rate from trials
3. **Duration**: Time-based measurements with built-in timers

## 🔒 Security

- User data isolation by organization/teacher
- Secure session management with PostgreSQL storage
- Input validation and SQL injection prevention
- HTTPS enforcement and security headers
- Audit logging for administrative actions

## 🗄 Database

- PostgreSQL with automatic schema management
- Foreign key constraints for data integrity
- Optimized indexes for performance
- Automated backup support

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:
```bash
DATABASE_URL=postgresql://user:pass@host:port/database
SESSION_SECRET=your_secure_32_character_secret
NODE_ENV=production
```

## 📖 Documentation

- **[API Documentation](DEPLOYMENT.md#api-endpoints)** - Backend API reference
- **[Security Guide](SECURITY.md)** - Security best practices
- **[Deployment Guide](DEPLOYMENT.md)** - Production setup
- **[Production Checklist](PRODUCTION_CHECKLIST.md)** - Pre-launch verification

## 🚀 Ready for Production

This application is production-ready with:
- ✅ Clean, optimized codebase
- ✅ Comprehensive security measures
- ✅ Complete documentation
- ✅ Multiple deployment options
- ✅ Professional reporting capabilities
- ✅ Scalable architecture

Perfect for educational institutions, therapy centers, and special education programs requiring robust data collection and progress monitoring.