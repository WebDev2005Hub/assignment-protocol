# Dual-Panel Activity & Protocol Visualizer

## Overview
The **Dual-Panel Activity & Protocol Visualizer** is a web-based educational dashboard designed to bridge the gap between user-facing application activities (Browsing, Mail, Streaming) and the underlying network protocol exchanges. It allows users to simulate these activities on the left panel and simultaneously observe the real-time, animated protocol sequence on the right panel. 

The visualizer supports both **Application-layer** (DNS, HTTP, SMTP) and **Transport-layer** (TCP, UDP) views, making it an excellent tool for understanding network stacks, TCP state machines, sequence numbering, and the differences between reliable (TCP) and datagram (UDP) delivery mechanisms.

## Key Features
* **Dual-Panel Layout:** Interactive activity simulator on the left, synchronized protocol visualizer on the right.
* **Dual-Layer Visualization Toggle:** Hot-swap between Application Layer (HTTP, SMTP, DNS) and Transport Layer (TCP handshakes, sequences, flags; UDP datagrams) views.
* **Animated State Machine:** Step-by-step playback controls (Play, Pause, Previous, Next, Replay) for network packet sequences.
* **Protocol Accuracy:** Accurate simulation of TCP 3-way handshakes, PSH/ACK data transfers, and connection teardowns.
* **Premium UI/UX:** Built with a modern, glassmorphism dark-mode aesthetic, utilizing micro-animations and smooth transitions.

## Architecture & Tech Stack
This project follows a lightweight client-server architecture:
* **Backend:** Python + Flask
  * Serves static frontend assets.
  * Provides REST API endpoints that return highly detailed, dual-layer JSON sequences representing the simulated network traffic.
* **Frontend:** Vanilla HTML5, CSS3, JavaScript
  * **No framework required.** Employs a custom JS state machine (`visualizer.js`) to handle playback and synchronization.
  * Styling is handled purely via custom CSS variables and keyframe animations (`style.css`).

## Project Structure
```text
.
├── app.py                  # Main Flask application and REST API endpoints
├── requirements.txt        # Python dependency manifest (Flask)
└── static/                 # Frontend static assets
    ├── index.html          # Main application layout and UI
    ├── css/
    │   └── style.css       # Premium dark-mode styles and animations
    └── js/
        ├── app.js          # UI interaction logic and API fetching
        └── visualizer.js   # Sequence rendering, timeline, and playback state machine
```

## Prerequisites
* **Python 3.8+** installed on your system.
* **pip** (Python package installer).

## Installation

1. **Clone or download the repository** and navigate to the project directory:
   ```bash
   cd path/to/project
   ```

2. **(Optional but Recommended) Create and activate a virtual environment:**
   * **Windows:**
     ```bash
     python -m venv .venv
     .venv\Scripts\activate
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install the required dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *(This will install `Flask==3.0.3` and its dependencies).*

## Running the Project

To start the development server, simply run the `app.py` script:

* **Windows:**
  ```bash
  python app.py
  ```
* **macOS / Linux:**
  ```bash
  python3 app.py
  ```

Once the server starts, open your web browser and navigate to:
**http://127.0.0.1:5000**

## Usage
1. Open the dashboard in your browser.
2. In the **Left Panel (Activity Selector)**, select a tab (Browsing, Mail, or Streaming).
3. Fill out the simulated form (e.g., enter a URL) and click the action button (e.g., "Visit Page").
4. Watch the **Right Panel (Protocol Visualizer)** automatically begin animating the packet sequence.
5. Use the **View Toggle** in the top right of the visualizer to switch between "App Layer" and "Transport Layer" perspectives. 
6. Click on individual packets in the timeline, or use the **Pause / Step** controls to manually inspect sequence numbers, acknowledgment numbers, window sizes, and TCP flags in the bottom details panel.

## API Endpoints
The Flask backend provides the following POST endpoints. Each accepts a JSON payload and returns the protocol sequence array.
* `POST /api/simulate/browsing` - Payload: `{ "url": "..." }`
* `POST /api/simulate/mail` - Payload: `{ "to": "...", "subject": "...", "body": "..." }`
* `POST /api/simulate/streaming` - Payload: `{ "quality": "1080p" }`

## Troubleshooting

| Issue | Likely Cause | Solution |
| :--- | :--- | :--- |
| **`ModuleNotFoundError: No module named 'flask'`** | Dependencies not installed or virtual environment not activated. | Ensure you ran `pip install -r requirements.txt` within your active environment. |
| **`OSError: [Errno 98] Address already in use`** | Port 5000 is occupied by another process (e.g., macOS AirPlay receiver). | Modify `app.py` line 211 to use a different port: `app.run(debug=True, port=5001)`. |
| **Animations not playing smoothly** | Browser performance throttling. | Ensure hardware acceleration is enabled in your browser settings. |

## Known Limitations & Security Notes
* **Simulation Only:** This application relies on hardcoded protocol sequences returned by the API for educational visualization. It does not open actual network sockets or capture real PCAP data.
* **Development Server:** The app currently uses Flask's built-in development server (`app.run()`). It is not intended for production deployment as-is.

---

## Quick Start & Command Reference

### Minimum Setup (Windows)
```bash
cd <project-directory>
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Command Reference
| Command | Purpose |
| :--- | :--- |
| `python -m venv .venv` | Creates a new Python virtual environment. |
| `.venv\Scripts\activate` | Activates the virtual environment (Windows). |
| `source .venv/bin/activate` | Activates the virtual environment (Mac/Linux). |
| `pip install -r requirements.txt` | Installs the exact project dependencies. |
| `python app.py` | Starts the Flask backend server on port 5000. |
