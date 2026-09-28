import sqlite3
import os
from datetime import datetime

# Database file path
DB_NAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sales.db')

def get_db_connection():
    """
    Establishes and returns a connection to the SQLite database.
    Row factory is set to sqlite3.Row so columns can be accessed by name like a dictionary.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the SQLite database table 'sales' if it does not already exist.
    Also seeds initial sample sales data if the table is empty.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create sales table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            price REAL NOT NULL CHECK (price >= 0),
            total_amount REAL NOT NULL,
            sale_date TEXT NOT NULL,
            notes TEXT
        )
    ''')
    
    # Check if database is empty; if so, insert initial sample records
    cursor.execute('SELECT COUNT(*) FROM sales')
    count = cursor.fetchone()[0]
    
    if count == 0:
        sample_sales = [
            ('Dell XPS 15 Laptop', 2, 125000.00, 250000.00, '2026-08-18 10:30:00', 'Enterprise Purchase'),
            ('Logitech MX Master 3S Mouse', 5, 8999.00, 44995.00, '2026-08-19 14:15:00', 'Accessories Order'),
            ('Samsung 34" Curved Monitor', 3, 35000.00, 105000.00, '2026-08-20 09:45:00', 'Office Upgrade'),
            ('Keychron K2 Mechanical Keyboard', 4, 7499.00, 29996.00, '2026-08-20 11:20:00', 'Developer Setup'),
            ('Sony WH-1000XM5 Headphones', 1, 29990.00, 29990.00, '2026-08-20 16:05:00', 'Individual Client')
        ]
        cursor.executemany('''
            INSERT INTO sales (product_name, quantity, price, total_amount, sale_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_sales)
        conn.commit()
        print("Database initialized with sample sales records.")
        
    conn.close()

def add_sale(product_name, quantity, price, sale_date=None, notes=''):
    """
    Calculates Total Amount (Total = Quantity * Price) and stores the sales record in SQLite.
    """
    quantity = int(quantity)
    price = float(price)
    # Core assignment formula: Total = Quantity * Price
    total_amount = round(quantity * price, 2)
    
    if not sale_date:
        sale_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sales (product_name, quantity, price, total_amount, sale_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (product_name, quantity, price, total_amount, sale_date, notes))
    conn.commit()
    conn.close()
    return total_amount

def get_all_sales(search_query=None):
    """
    Retrieves all sales records from SQLite database, sorted by sale_date descending.
    Optional search_query filters records by product_name or notes.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if search_query:
        query_param = f"%{search_query}%"
        cursor.execute('''
            SELECT * FROM sales 
            WHERE product_name LIKE ? OR notes LIKE ?
            ORDER BY sale_date DESC, id DESC
        ''', (query_param, query_param))
    else:
        cursor.execute('SELECT * FROM sales ORDER BY sale_date DESC, id DESC')
        
    sales = cursor.fetchall()
    conn.close()
    return sales

def get_sales_summary():
    """
    Calculates aggregate summary statistics for the sales dashboard.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            COUNT(*) as total_transactions,
            COALESCE(SUM(quantity), 0) as total_quantity_sold,
            COALESCE(SUM(total_amount), 0.0) as grand_total_revenue,
            COALESCE(AVG(total_amount), 0.0) as avg_transaction_value
        FROM sales
    ''')
    summary = cursor.fetchone()
    conn.close()
    return {
        'total_transactions': summary['total_transactions'],
        'total_quantity_sold': summary['total_quantity_sold'],
        'grand_total_revenue': round(summary['grand_total_revenue'], 2),
        'avg_transaction_value': round(summary['avg_transaction_value'], 2)
    }

def delete_sale_by_id(sale_id):
    """
    Deletes a sales record by its ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sales WHERE id = ?', (sale_id,))
    conn.commit()
    conn.close()
