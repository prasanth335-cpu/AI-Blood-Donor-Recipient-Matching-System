from flask import Flask, render_template, request, redirect, url_for, flash
from datetime import datetime
import database

app = Flask(__name__)
# Secret key for Flash session messages
app.secret_key = 'infosys_sales_management_secret_key_day1'

# Initialize SQLite database schema and seed sample data on startup
database.init_db()

@app.route('/')
def index():
    """
    Dashboard Route: Displays summary stats cards and Bootstrap table of all sales records.
    Supports optional keyword search filtering.
    """
    search_query = request.args.get('search', '').strip()
    sales_records = database.get_all_sales(search_query if search_query else None)
    summary = database.get_sales_summary()
    
    return render_template(
        'index.html',
        sales=sales_records,
        summary=summary,
        search_query=search_query
    )

@app.route('/add', methods=['GET', 'POST'])
def add_sale():
    """
    Add Sales Record Route:
    - GET: Renders the sales entry form.
    - POST: Validates inputs, calculates Total = Quantity * Price, inserts record into SQLite DB.
    """
    if request.method == 'POST':
        product_name = request.form.get('product_name', '').strip()
        quantity_raw = request.form.get('quantity', '').strip()
        price_raw = request.form.get('price', '').strip()
        sale_date_raw = request.form.get('sale_date', '').strip()
        notes = request.form.get('notes', '').strip()

        # Backend Input Validation
        errors = []
        if not product_name:
            errors.append("Product Name is required.")
        
        try:
            quantity = int(quantity_raw)
            if quantity <= 0:
                errors.append("Quantity must be a positive integer.")
        except ValueError:
            errors.append("Quantity must be a valid integer.")
            quantity = 0

        try:
            price = float(price_raw)
            if price < 0:
                errors.append("Price cannot be negative.")
        except ValueError:
            errors.append("Price must be a valid number.")
            price = 0.0

        if errors:
            for error in errors:
                flash(error, 'danger')
            return render_template('add_sale.html', 
                                   product_name=product_name, 
                                   quantity=quantity_raw, 
                                   price=price_raw, 
                                   sale_date=sale_date_raw, 
                                   notes=notes)

        # Format sale_date if provided or default to current timestamp
        if sale_date_raw:
            try:
                # Format html datetime-local string to standard readable string
                dt = datetime.strptime(sale_date_raw, '%Y-%m-%dT%H:%M')
                sale_date = dt.strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                sale_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        else:
            sale_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Insert record into SQLite (database.add_sale calculates Total = Quantity * Price)
        total = database.add_sale(product_name, quantity, price, sale_date, notes)
        
        flash(f"Sales record for '{product_name}' (Total: ₹{total:,.2f}) added successfully!", 'success')
        return redirect(url_for('index'))

    # GET request: render empty form with default current date/time
    now_formatted = datetime.now().strftime('%Y-%m-%dT%H:%M')
    return render_template('add_sale.html', sale_date=now_formatted)

@app.route('/delete/<int:sale_id>', methods=['POST'])
def delete_sale(sale_id):
    """
    Delete Sales Record Route: Deletes specified sales entry from SQLite database.
    """
    database.delete_sale_by_id(sale_id)
    flash(f"Sales record #{sale_id} deleted successfully.", 'warning')
    return redirect(url_for('index'))

if __name__ == '__main__':
    print("Starting Sales Management System on http://127.0.0.1:5000 ...")
    app.run(debug=True, host='127.0.0.1', port=5000)
