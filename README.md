# 📊 OctaByte-Stock

A modern stock portfolio and analytics platform with a **Node.js + Python backend** for real-time stock data (via web scraping & APIs) and a **React + shadcn frontend** for a sleek user experience.

---

## ⚙️ Architecture

- **Backend (Node.js + Express)**  
  - REST API for stock data  
  - Calls Python scraper as subprocess for scraping Yahoo Finance & Google Finance  
  - Caching + rate limiting to optimize API usage  

- **Python Scraper**  
  - Uses `yfinance` (Yahoo Finance) and `BeautifulSoup` (Google Finance fallback)  
  - Returns data to Node.js server in JSON  

- **Frontend (React + shadcn/ui + Tailwind)**  
  - Interactive dashboards  
  - Clean modern UI  
  - Connects to backend APIs  

---

## 🚀 Setup Guide

### 1️⃣ Clone Repository
```bash
git clone https://github.com/your-username/insight-vest.git
cd insight-vest
```
2️⃣ Backend Setup (Node.js + Python)
```bash
cd Backend
```
Environment Variables

Create a .env file:
```bash
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
API_RATE_LIMIT_PER_MINUTE=60
NODE_ENV=development
```

Install Node.js dependencies
```bash
npm install
```

Install Python dependencies
```bash
pip install -r requirements.txt
```
Run Server

Dev mode:
```bash
npm run dev
```

Production:
```bash
npm start
```

Backend will run at: http://localhost:3001

3️⃣ Frontend Setup (React + shadcn)
```bash
cd Frontend
```

Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Frontend will run at: http://localhost:3000
