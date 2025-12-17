# PrivyJournal

### Self-Hosted, Private Journaling - *Your Thoughts, Your Control*

PrivyJournal is a modern, self-hosted web application designed for secure and private journaling. Built with privacy in mind, it allows you to keep track of your thoughts, daily activities, and insights without relying on third-party cloud services.

## ✨ Features

- **🔒 Private & Secure**: Self-hosted solution means you own your data.
- **📝 Rich Text Editing**: Support for Markdown journaling to express yourself freely.
- **📊 Insights & Analytics**: Visualize your journaling habits and streaks.
- **📅 Calendar View**: Navigate through your entries with an intuitive calendar interface.
- **🏷️ Quick Notes**: Rapidly capture thoughts and ideas on the go.
- **🌓 Modern UI**: Clean, responsive interface built with React and Vite.

## 🛠️ Tech Stack

### Client (Frontend)
- **Framework**: React (Vite)
- **Language**: TypeScript
- **Routing**: React Router DOM
- **Utilities**: Axios, React Markdown, React Calendar, Hello Pangea DnD

### Server (Backend)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (Simple, lightweight, file-based)
- **Authentication**: JWT & Bcrypt

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hacck3y/PrivyJournal.git
   cd PrivyJournal
   ```

2. **Setup Server**
   ```bash
   cd PrivyJournal/server
   npm install
   
   # Create a .env file
   cp .env.example .env
   # Make sure to set a secure JWT_SECRET in your .env file
   ```

3. **Setup Client**
   ```bash
   cd PrivyJournal/client
   npm install
   ```

### 🐳 Run with Docker (Recommended)

You can run the entire application with a single command using Docker.

1. **Ensure you have Docker installed.**
2. **Run the following command:**
   ```bash
   docker-compose up -d --build
   ```
3. **Access the app:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:5000

The database will be persisted in `server/data`.

### 🏃‍♂️ Running Locally (Manual)

To run the application in development mode:

**1. Start the Backend Server**
```bash
cd PrivyJournal/server
npm run dev
# Server will run on http://localhost:3000 (default)
```

**2. Start the Frontend Client**
Open a new terminal:
```bash
cd PrivyJournal/client
npm run dev
# Client will run on http://localhost:5173 (default)
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Hacck3y/PrivyJournal/blob/main/LICENSE) file for details.

---
*Created with ❤️ by hacck3y*
