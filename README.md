# Virtual 3D Home Builder 🏠✨

🔗 **Live Demo:**  
https://virtual-3d-home-builder-1.onrender.com

**Virtual 3D Home Builder** is an AI-powered web application that converts **2D blueprint images** into **interactive 3D models**.  
Users can upload blueprint scans, extract structural data, and visualize the generated 3D model directly in the browser.

This project demonstrates the integration of **AI concepts, Django backend logic, and modern frontend UI** for automated 3D reconstruction.

---

## 🚀 Features

- 🔐 **User Authentication** (Signup & Login)
- 📤 **Blueprint Image Upload**
- 🧠 **AI-based Blueprint Analysis**
  - Walls
  - Doors
  - Windows
- 📊 **Extracted Data View**
- 🏗️ **3D Model Generation**
- 🎮 **Interactive 3D Viewer**
- 🌐 **Live Web Demo (GitHub Pages)**

---

## 🌍 Live Demo

👉 **Try it here:**  
https://virtual-3d-home-builder-1.onrender.com

> ⚠️ *Note:*  
> The live demo focuses on UI & visualization.  
> AI processing and model generation run on the backend (Django) and may not be fully active in the GitHub Pages demo.

---
## 🛠 Tech Stack

| Layer | Technology |
|------|-----------|
| Backend | Python, Django |
| Frontend | HTML, Tailwind CSS, JavaScript |
| Database | SQLite |
| AI / CV | Blueprint image processing |
| 3D Rendering | Browser-based 3D viewer (Three.js compatible) |
| Deployment | GitHub Pages (Frontend), Render (Backend) |

---

## ⚙️ Local Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Ananthu0003/Virtual-3D-home-Builder.git
cd Virtual-3D-home-Builder

### 2️⃣ Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

### 3️⃣ Install dependencies
pip install -r requirements.txt

### 4️⃣ Run migrations
python manage.py migrate

### 5️⃣ Start server
python manage.py runserver

## Visit:

http://127.0.0.1:8000


🧩 How It Works

1. User uploads a blueprint image

2. AI extracts geometric & structural data

3. Coordinates are processed to form a 3D model

4. User can:

    - View extracted data

    - View the generated 3D model interactively

✔️ Accurate coordinates = Accurate 3D model

