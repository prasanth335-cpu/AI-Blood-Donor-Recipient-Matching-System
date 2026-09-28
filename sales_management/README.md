# Sales Management System - Day 1 Task (Infosys Internship)

A web-based **Sales Management System** developed using **Python Flask**, **SQLite**, **HTML5**, **Bootstrap 5**, and **Jinja2** templating engine.

---

## 📌 Objectives & Core Features

1. **Add Sales Record**: Form to capture Product Name, Quantity, Price per Unit, Sale Date, and optional Notes/Customer details.
2. **SQLite Database Persistence**: Stores sales data permanently in a relational SQLite database (`sales.db`).
3. **Automated Total Calculation**: Computes `Total Amount = Quantity × Price` both dynamically on the client-side (real-time preview) and securely on the backend server before database insertion.
4. **Bootstrap Dashboard Table**: Displays all sales records in a styled Bootstrap 5 responsive table with aggregate metric cards (Grand Revenue, Total Items Sold, Transaction Count, Average Sale Value).
5. **Interactive Actions**: Keyword search filtering and single-click record deletion with confirmation.

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **Python 3** | Core backend programming language |
| **Flask** | Lightweight Web Framework for handling HTTP routes, requests, and templates |
| **SQLite 3** | Relational Database Management System (RDBMS) for persistent data storage |
| **HTML5 & CSS3** | Web structure, layout, and visual glassmorphism aesthetic styling |
| **Bootstrap 5** | Responsive UI framework, pre-built components (Table, Navbar, Cards, Alerts) |
| **Jinja2** | Server-side templating engine for dynamically rendering backend data into HTML |
| **JavaScript (ES6)** | Real-time frontend calculation (`Total = Quantity × Price`) without reloading page |

---

## 📁 Project Directory Structure

```text
sales_management/
├── app.py                  # Main Flask web application (routes & controller logic)
├── database.py             # SQLite helper module (table initialization, CRUD operations)
├── sales.db                # SQLite database file (created automatically on startup)
├── requirements.txt        # Python dependency list (Flask)
├── README.md               # Project documentation & explanation
├── static/
│   ├── css/
│   │   └── style.css       # Custom modern CSS styling (gradients, card animations)
│   └── js/
│       └── main.js         # Frontend JS logic for real-time total calculation
└── templates/
    ├── base.html           # Master layout template (Navbar, Bootstrap CDNs, Footer)
    ├── index.html          # Sales Dashboard with metric cards & Bootstrap table
    └── add_sale.html       # Add Sale Record form with live calculation display
```

---

## 🧮 Mathematical & Business Logic

The key assignment formula implemented in Python backend (`database.py`) and JavaScript frontend (`main.js`):

$$\text{Total Amount} = \text{Quantity} \times \text{Price}$$

### Example Calculation:
If a user buys **5 units** of a product priced at **₹8,999.00** each:
$$\text{Total Amount} = 5 \times 8999.00 = ₹44,995.00$$

---

## 🚀 How to Run the Application

### Step 1: Navigate to Project Directory
```bash
cd sales_management
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Launch the Flask Server
```bash
python app.py
```

### Step 4: Open in Web Browser
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 💡 Code Walkthrough & Key Concepts Explained

### 1. Database Schema (`database.py`)
```sql
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price REAL NOT NULL CHECK (price >= 0),
    total_amount REAL NOT NULL,
    sale_date TEXT NOT NULL,
    notes TEXT
);
```

### 2. Backend Insertion & Total Computation (`database.py`)
```python
def add_sale(product_name, quantity, price, sale_date=None, notes=''):
    quantity = int(quantity)
    price = float(price)
    # Core Formula: Total = Quantity * Price
    total_amount = round(quantity * price, 2)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sales (product_name, quantity, price, total_amount, sale_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (product_name, quantity, price, total_amount, sale_date, notes))
    conn.commit()
    conn.close()
    return total_amount
```

### 3. Dynamic Table Rendering using Jinja2 (`templates/index.html`)
```jinja2
{% for record in sales %}
<tr>
    <td>#{{ record.id }}</td>
    <td>{{ record.product_name }}</td>
    <td>{{ record.quantity }}</td>
    <td>${{ "%.2f"|format(record.price) }}</td>
    <td>${{ "%.2f"|format(record.total_amount) }}</td>
    <td>{{ record.sale_date }}</td>
    <td>{{ record.notes }}</td>
</tr>
{% endfor %}
```

---

## 📝 Internship Day 1 Summary

In this task, we successfully built an end-to-end full-stack Flask web application adhering to all Infosys internship requirements. The application seamlessly bridges database queries, backend request processing, server-side dynamic template rendering, and interactive frontend client computing.
