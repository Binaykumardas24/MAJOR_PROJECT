# Backend API Reference

## Base URL
```
http://localhost:8000
```

## Authentication
All protected endpoints require:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### **1. Register User**
```
POST /register

Body:
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (201):
{
  "status": "USER REGISTERED",
  "id": "507f1f77bcf86cd799439011"
}
```

### **2. Login User**
```
POST /login

Body:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "profile_image": null
  }
}
```

---

## Face Authentication Endpoints

### **3. Register Face**
```
POST /register-face

Headers:
Authorization: Bearer <token>

Body: (multipart/form-data)
file: <image_file> (JPG/PNG)

Response (200):
{
  "status": "FACE REGISTERED"
}
or
{
  "status": "FACE NOT DETECTED"
}
```

### **4. Face Login**
```
POST /login-face

Body: (multipart/form-data)
file: <image_file> (JPG/PNG)

Response (200):
{
  "status": "LOGIN SUCCESS",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "profile_image": null
  }
}
or
{
  "status": "LOGIN FAILED"
}
```

---

## Profile Management Endpoints

### **5. Get Profile**
```
GET /profile

Headers:
Authorization: Bearer <token>

Response (200):
{
  "id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile_image": "data:image/jpeg;base64,..."
}
```

### **6. Update Profile**
```
PUT /profile

Headers:
Authorization: Bearer <token>

Body:
{
  "first_name": "Jonathan",     // Optional
  "last_name": "Doe",           // Optional
  "profile_image": "data:..."   // Optional (base64)
}

Response (200):
{
  "status": "PROFILE UPDATED",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "first_name": "Jonathan",
    "last_name": "Doe",
    "profile_image": "data:image/jpeg;base64,..."
  }
}
```

---

## Interview Endpoints

### **7. Save Interview Result** ✨ NEW
```
POST /interview-result

Headers:
Authorization: Bearer <token>

Body:
{
  "user_id": "507f1f77bcf86cd799439011",
  "category": "HR",
  "score": 85,
  "transcript": "Tell me about yourself...",
  "questions_answered": 3
}

Response (200):
{
  "status": "INTERVIEW RESULT SAVED",
  "score": 85,
  "category": "HR"
}

Error (500):
{
  "detail": "Failed to save interview result: <error>"
}
```

---

## Error Responses

### **400 Bad Request**
```json
{
  "detail": "First name and last name required"
}
```

### **401 Unauthorized**
```json
{
  "detail": "Invalid token"
}
```

### **500 Internal Server Error**
```json
{
  "detail": "Failed to save interview result: <error>"
}
```

---

## Request Examples

### **Example 1: Complete Interview Flow**

```bash
# 1. Register
curl -X POST http://localhost:8000/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# 2. Login
TOKEN=$(curl -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }' | jq -r '.access_token')

# 3. Update Profile
curl -X PUT http://localhost:8000/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jonathan"
  }'

# 4. Save Interview Result
curl -X POST http://localhost:8000/interview-result \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "507f1f77bcf86cd799439011",
    "category": "HR",
    "score": 85,
    "transcript": "Sample answer...",
    "questions_answered": 3
  }'
```

---

## Database Schema

### **Users Collection**
```javascript
{
  _id: ObjectId,
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  hashed_password: "$2b$12$...",
  profile_image: "data:image/jpeg;base64,...",
  interview_results: [
    {
      user_id: "507f1f77bcf86cd799439011",
      category: "HR",
      score: 85,
      transcript: "Tell me about yourself...",
      questions_answered: 3,
      timestamp: ISODate("2024-02-13T10:30:00Z")
    }
  ]
}
```

---

## Security Features

✅ **JWT Authentication** - Token-based auth with 7-day expiry
✅ **Password Hashing** - bcrypt with 12-round salt
✅ **CORS Enabled** - Development-friendly CORS
✅ **Face Recognition** - DeepFace with Facenet model
✅ **Error Handling** - Proper HTTP status codes

---

## Rate Limiting

Currently disabled for development. Consider implementing for production:
- Login attempts: 5 per minute
- API calls: 100 per minute

---

## Testing Tools

### **Postman Collection Import**
```json
{
  "info": {
    "name": "APIS Backend",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/register"
      }
    }
  ]
}
```

### **Direct cURL Testing**
See examples above.

### **Frontend Integration**
The frontend uses Axios:
```javascript
import axios from 'axios';

const token = localStorage.getItem('token');
const response = await axios.post(
  'http://127.0.0.1:8000/interview-result',
  {
    user_id: user.id,
    category: 'HR',
    score: 85,
    transcript: '...',
    questions_answered: 3
  },
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
```

---

## Environment Variables

```
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/?appName=APIS
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
```

---

**Last Updated**: February 13, 2026  
**API Version**: 1.0.0  
**Status**: ✅ All Endpoints Functional
