# Podology CRM

A simple and efficient CRM (Customer Relationship Management) system designed specifically for podology clinics. This application allows administrators to manage client records, keep track of anamnesis, and schedule appointments.

## 🚀 Features

- **Admin Authentication**: Secure registration and login for clinic administrators.
- **Client Management**: Register and store detailed client information.
- **Anamnesis Tracking**: Keep a history of client health records and previous treatments.
- **Appointment Scheduling**: Register consultation dates and times.
- **Consultation Summaries**: View a quick overview of each client's visit frequency and last consultation.

## 🛠️ Technologies Used

### Backend
- **FastAPI**: Modern, fast (high-performance) web framework for building APIs with Python.
- **SQLite**: Lightweight, file-based database.
- **Pydantic**: Data validation and settings management.
- **Uvicorn**: ASGI server for running the FastAPI application.

### Frontend
- **HTML5 & Vanilla CSS**: Clean and responsive user interface.
- **JavaScript (ES6+)**: Dynamic interaction with the backend API.

## 📋 Prerequisites

- **Python 3.8+** installed on your system.

## ⚙️ Installation & Setup

Follow these steps to get the project running locally:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd podology-crm
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment**:
   - **On Windows**:
     ```bash
     .venv\Scripts\activate
     ```
   - **On Linux/macOS/WSL**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## 🏃 How to Run

To start the server, run the following command in your terminal:

```bash
python main.py
```

The application will be available at `http://localhost:8000`.

## 🔄 Step-by-Step Workflow

1. **Register**: On the landing page, create a new administrator account by providing a login, password, and your full name.
2. **Login**: Use your credentials to access the Dashboard.
3. **Register Clients**: Fill out the client registration form, including:
   - Name and Contact Info (Phone, Email).
   - **Anamnesis**: Initial health assessment and history.
   - **Scheduling**: Choose the date and time for the consultation.
4. **Manage Records**: View the list of registered clients and their consultation history. Each time you register an appointment for an existing name/phone, it accumulates in their history.
5. **Dashboard Summary**: Check the summary section to see which clients are visiting more often and when their last visit was.

## 📂 Project Structure

- `main.py`: The entry point of the FastAPI application and API routes.
- `database.db`: SQLite database file (created automatically on first run).
- `public/`: Contains static frontend files (`index.html`, `dashboard.html`).
- `public/css/`: Stylesheets for the application.
- `public/js/`: JavaScript logic for handling API calls and DOM manipulation.
- `requirements.txt`: List of Python dependencies.

## 📄 License

This project is open-source. Feel free to modify and adapt it to your needs.
