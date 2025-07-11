# Logsight – AI-Powered Log Analytics & Anomaly Detection

## Overview

A full-stack cybersecurity application that allows SOC analysts to upload log files, parse them automatically, and detect anomalies using machine learning. Built with Next.js, Flask, PostgreSQL, and Docker.

## Features

- 🔐 **Secure Authentication** - JWT-based login system
- 📁 **Multi-format Log Support** - ZScaler Web Proxy, Nginx, Apache, and more
- 🤖 **AI-Powered Analysis** - Automated log parsing and summarization
- ⚡ **Real-time Anomaly Detection** - ML-based detection with confidence scoring
- 📊 **Interactive Timeline** - Visual timeline of events for quick SOC analysis
- 🎯 **Threat Intelligence** - Highlighted anomalous entries with explanations
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, React 18, Tailwind CSS
- **Backend**: Flask, Python 3.12, SQLAlchemy
- **Database**: PostgreSQL 16 with JSONB support
- **ML/AI**: scikit-learn Isolation Forest, pandas, OpenAI GPT-4o (optional)
- **Infrastructure**: Docker, Docker Compose
- **Authentication**: NextAuth with JWT

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd logsight
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the application**
```bash
docker compose up --build
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/docs

### Default Login

- Email: `admin@logsight.com`
- Password: `admin123`

## Project Structure

```
logsight/
├── README.md
├── docker-compose.yml
├── .env.example
├── frontend/              # Next.js React application
│   ├── app/              # App Router pages
│   ├── components/       # Reusable UI components
│   ├── lib/             # Utilities and API client
│   └── package.json
├── backend/              # Flask Python API
│   ├── app/             # Application code
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── routes/      # API endpoints
│   │   └── services/    # Business logic
│   ├── tests/           # Unit tests
│   └── requirements.txt
└── examples/             # Sample log files
    ├── zscaler_sample.log
    └── nginx_sample.log
```

## AI/ML Approach

### 1. Log Parsing
- **Regex-based detection**: Automatically identifies log format (ZScaler, Nginx, Apache, etc.)
- **Pandas processing**: Efficient parsing into structured DataFrames
- **Flexible architecture**: Easy to add new log formats

### 2. Anomaly Detection
- **Isolation Forest**: Unsupervised ML algorithm for outlier detection
- **Feature Engineering**: 
  - Request frequency per IP
  - Unusual HTTP methods/status codes
  - Time-based patterns
  - URL/domain analysis
- **Confidence Scoring**: 0.0-1.0 scale with explanations
- **Real-time Processing**: Streaming analysis for large files

### 3. Timeline Summarization
- **Automated grouping**: Events clustered by time windows
- **Statistical analysis**: Top IPs, status codes, traffic patterns
- **GPT-4o integration**: Optional semantic summaries for complex patterns

## API Documentation

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User authentication | No |
| POST | `/api/logs/upload` | Upload log file | Yes |
| GET | `/api/logs/{id}` | Get parsed log data | Yes |
| GET | `/api/logs/{id}/anomalies` | Get anomaly results | Yes |
| GET | `/api/logs/{id}/download` | Download original file | Yes |

## Sample Log Formats Supported

### ZScaler Web Proxy
```
2024-01-15 10:30:45 GET https://example.com 200 1024 192.168.1.100 "Mozilla/5.0..."
```

### Nginx Access Log
```
192.168.1.100 - - [15/Jan/2024:10:30:45 +0000] "GET /api/users HTTP/1.1" 200 1024
```

### Custom Format
Easily extensible parser architecture allows adding new formats via regex patterns.

## Anomaly Detection Examples

The system detects various types of anomalies:

- **Volume-based**: Unusual number of requests from single IP
- **Behavioral**: Rare HTTP methods or status codes
- **Temporal**: Traffic spikes at unusual hours
- **Pattern-based**: Scanning behavior, failed login attempts

Each anomaly includes:
- Confidence score (0.0-1.0)
- Human-readable explanation
- Contextual information
- Timestamp and affected entries

## Development

### Running Tests
```bash
# Backend tests
cd backend && python -m pytest

# Frontend tests
cd frontend && npm test
```

### Adding New Log Formats
1. Create parser in `backend/app/services/parsers/`
2. Add regex patterns and field mappings
3. Register in parser factory
4. Add test cases

## Deployment

### Cloud Deployment (Optional)
- **Frontend**: Vercel or Netlify
- **Backend**: GCP Cloud Run or AWS ECS
- **Database**: Cloud SQL or RDS
- **Storage**: GCS or S3 for log files

## Security Features

- BCrypt password hashing
- JWT token authentication
- CORS protection
- File upload validation
- Rate limiting on authentication endpoints
- Input sanitization and validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details 