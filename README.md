# MERNBase

This project is a MERN Stack Template designed to provide a ready-to-use boilerplate for building full-stack web applications using MongoDB, Express, React, and Node.js. It serves as a foundation for developers to kickstart their projects without the hassle of setting up folder structures, installing dependencies, or configuring essential tools.

---

# Who is this for?
- Developers looking for a pre-configured MERN stack setup to save time and streamline the initial development process.
- Students or learners who want a simple and structured starting point for practicing full-stack development.
- Teams or freelancers building scalable web applications with React for the frontend and Node.js for the backend.

## **Prerequisites**

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 14.x or above)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database) or a local MongoDB instance
- [Git](https://git-scm.com/)

---

## **Setup Instructions**

### 1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Navigate to folder directory and Install Dependencies (for both Client and Server)
```bash
cd <repository-name>
npm install
```

### 3. Create .env file in root folder
```bash
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/mydatabase?retryWrites=true&w=majority
```

---

## **Run the Application**

### 1. Start the Server
```bash
npm start
```

### 2. Access the API
```
http://localhost:5000
```

### 3. Start the Client
```bash
npm start
```

### 4. Access the Client
```
http://localhost:3000
```

---

# Client Customization Guide — Make It Yours

The `client/` app is a production-ready React + MUI frontend with:
- Polished **Home** (full-screen sections + smooth scroll)
- **Auth** page wired for `http://localhost:5000` (CRA-safe envs)
- **Dashboard** with interactive **Recharts**
- A clean **Header** / **Footer** and brandable assets

Follow the steps below to turn this into **your** website.

## 0) Prerequisites

- Node 18+ recommended
- npm / yarn
- A backend (default: `http://localhost:5000`)

## 1) Install & Run
```bash
cd client
npm install
npm start
```

## 2) Project Structure
```
client/
  public/
    index.html
    logo.png
  src/
    components/
      Header.tsx
      Footer.tsx
    pages/
      Home.tsx
      AuthPage.tsx
      Dashboard.tsx
    App.tsx
    index.css
```

## 3) Brand the App
- Replace `public/logo.png`
- Edit `public/index.html` title/meta
- Change `Header.tsx` brand name
- Edit `Footer.tsx` content

## 4) Backend API URL
Create `client/.env`:
```
REACT_APP_API_URL=http://localhost:5000
```

## 5) Home Page Edits
- Update hero text in `Home.tsx`
- Modify features & testimonials arrays

## 6) Dashboard Data
- Replace mock data with API calls

## 7) Theme
- Create `src/theme.ts` for brand colors
- Wrap app in `ThemeProvider`

## 8) Routes
Edit `App.tsx` to add/remove pages.

## 9) Build
```bash
npm run build
```

Deploy to Netlify, Vercel, or static host.

---

## Quick Checklist

- [ ] Replace logo
- [ ] Update HTML meta
- [ ] Update brand text
- [ ] Set `REACT_APP_API_URL`
- [ ] Wire real API
- [ ] Swap mock → API in Dashboard
- [ ] Customize theme
