import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Infosys Internship Day 1 Task - Sales Management System in Java
 * Core Requirements:
 * 1. Add a sales record.
 * 2. Store the sales record in SQLite database.
 * 3. Calculate Total = Quantity * Price.
 * 4. Display all sales records in a Bootstrap table.
 */
public class SalesApp {

    private static final int PORT = 8080;
    private static final String DB_URL = "jdbc:sqlite:sales_java.db";

    public static void main(String[] args) throws Exception {
        // Initialize SQLite Database schema & seed sample data
        initDatabase();

        // Start Java HTTP Server
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/", new DashboardHandler());
        server.createContext("/add", new AddSaleHandler());
        server.createContext("/delete", new DeleteSaleHandler());
        server.setExecutor(null); // default executor

        System.out.println("=================================================");
        System.out.println("  Java Sales Management System Started Successfully");
        System.out.println("  Access Dashboard: http://localhost:" + PORT);
        System.out.println("=================================================");
        server.start();
    }

    // =========================================================================
    // SQLite Database Logic
    // =========================================================================
    private static Connection getConnection() throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            // Driver fallback if using standard DriverManager
        }
        return DriverManager.getConnection(DB_URL);
    }

    private static void initDatabase() {
        String createTableSQL = """
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                total_amount REAL NOT NULL,
                sale_date TEXT NOT NULL,
                notes TEXT
            );
        """;

        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute(createTableSQL);

            // Seed initial sample data if table is empty
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM sales");
            if (rs.next() && rs.getInt(1) == 0) {
                String insertSQL = """
                    INSERT INTO sales (product_name, quantity, price, total_amount, sale_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?);
                """;
                try (PreparedStatement pstmt = conn.prepareStatement(insertSQL)) {
                    insertSample(pstmt, "Dell XPS 15 Laptop", 2, 125000.00, "2026-08-18 10:30:00", "Enterprise Purchase");
                    insertSample(pstmt, "Logitech MX Master 3S Mouse", 5, 8999.00, "2026-08-19 14:15:00", "Accessories Order");
                    insertSample(pstmt, "Samsung 34 Curved Monitor", 3, 35000.00, "2026-08-20 09:45:00", "Office Upgrade");
                    insertSample(pstmt, "Keychron K2 Keyboard", 4, 7499.00, "2026-08-20 11:20:00", "Developer Setup");
                    insertSample(pstmt, "Sony WH-1000XM5 Headphones", 1, 29990.00, "2026-08-20 16:05:00", "Individual Client");
                }
                System.out.println("SQLite Database initialized with sample sales records.");
            }
        } catch (SQLException e) {
            System.err.println("Database initialization error: " + e.getMessage());
        }
    }

    private static void insertSample(PreparedStatement pstmt, String name, int qty, double price, String date, String notes) throws SQLException {
        double total = qty * price;
        pstmt.setString(1, name);
        pstmt.setInt(2, qty);
        pstmt.setDouble(3, price);
        pstmt.setDouble(4, total);
        pstmt.setString(5, date);
        pstmt.setString(6, notes);
        pstmt.executeUpdate();
    }

    // =========================================================================
    // HTTP Request Handlers
    // =========================================================================

    // GET / : Dashboard View
    static class DashboardHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(455, -1);
                return;
            }

            List<SaleRecord> records = new ArrayList<>();
            double grandTotal = 0.0;
            int totalQty = 0;

            try (Connection conn = getConnection();
                 Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT * FROM sales ORDER BY sale_date DESC, id DESC")) {

                while (rs.next()) {
                    SaleRecord s = new SaleRecord(
                            rs.getInt("id"),
                            rs.getString("product_name"),
                            rs.getInt("quantity"),
                            rs.getDouble("price"),
                            rs.getDouble("total_amount"),
                            rs.getString("sale_date"),
                            rs.getString("notes")
                    );
                    records.add(s);
                    grandTotal += s.totalAmount();
                    totalQty += s.quantity();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }

            double avgValue = records.isEmpty() ? 0.0 : grandTotal / records.size();

            String html = renderDashboardHtml(records, grandTotal, totalQty, records.size(), avgValue);
            sendHtmlResponse(exchange, html);
        }
    }

    // GET & POST /add : Add Sale View & Submission
    static class AddSaleHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();

            if ("GET".equalsIgnoreCase(method)) {
                String html = renderAddSaleHtml();
                sendHtmlResponse(exchange, html);
            } else if ("POST".equalsIgnoreCase(method)) {
                Map<String, String> formData = parseFormData(exchange.getRequestBody());

                String productName = formData.getOrDefault("product_name", "").trim();
                int quantity = Integer.parseInt(formData.getOrDefault("quantity", "1"));
                double price = Double.parseDouble(formData.getOrDefault("price", "0.0"));
                String notes = formData.getOrDefault("notes", "").trim();

                // Core Assignment Requirement: Total = Quantity * Price
                double totalAmount = quantity * price;

                String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

                String insertSQL = "INSERT INTO sales (product_name, quantity, price, total_amount, sale_date, notes) VALUES (?, ?, ?, ?, ?, ?)";
                try (Connection conn = getConnection(); PreparedStatement pstmt = conn.prepareStatement(insertSQL)) {
                    pstmt.setString(1, productName);
                    pstmt.setInt(2, quantity);
                    pstmt.setDouble(3, price);
                    pstmt.setDouble(4, totalAmount);
                    pstmt.setString(5, date);
                    pstmt.setString(6, notes);
                    pstmt.executeUpdate();
                } catch (SQLException e) {
                    e.printStackTrace();
                }

                // Redirect to Dashboard
                exchange.getResponseHeaders().set("Location", "/");
                exchange.sendResponseHeaders(302, -1);
            }
        }
    }

    // POST /delete : Delete Record
    static class DeleteSaleHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> formData = parseFormData(exchange.getRequestBody());
                int id = Integer.parseInt(formData.getOrDefault("id", "0"));

                try (Connection conn = getConnection();
                     PreparedStatement pstmt = conn.prepareStatement("DELETE FROM sales WHERE id = ?")) {
                    pstmt.setInt(1, id);
                    pstmt.executeUpdate();
                } catch (SQLException e) {
                    e.printStackTrace();
                }
            }
            exchange.getResponseHeaders().set("Location", "/");
            exchange.sendResponseHeaders(302, -1);
        }
    }

    // =========================================================================
    // HTML Template Generators (Bootstrap 5)
    // =========================================================================
    private static String renderDashboardHtml(List<SaleRecord> records, double grandTotal, int totalQty, int totalTx, double avgValue) {
        StringBuilder rowsHtml = new StringBuilder();
        NumberFormat fmt = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

        for (SaleRecord r : records) {
            rowsHtml.append(String.format("""
                <tr>
                    <td class="ps-4 fw-semibold text-secondary">#%d</td>
                    <td class="fw-bold text-dark">%s</td>
                    <td class="text-center"><span class="badge bg-secondary-subtle text-dark rounded-pill px-3">%d</span></td>
                    <td class="text-end font-monospace">₹%.2f</td>
                    <td class="text-end fw-bold text-success font-monospace">₹%.2f</td>
                    <td class="text-muted fs-7">%s</td>
                    <td class="text-secondary fs-7">%s</td>
                    <td class="text-center pe-4">
                        <form method="POST" action="/delete" style="display:inline;" onsubmit="return confirm('Delete this record?');">
                            <input type="hidden" name="id" value="%d" />
                            <button type="submit" class="btn btn-sm btn-link text-danger p-0">Delete</button>
                        </form>
                    </td>
                </tr>
            """, r.id(), escapeHtml(r.productName()), r.quantity(), r.price(), r.totalAmount(), r.saleDate(), escapeHtml(r.notes()), r.id()));
        }

        return String.format("""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Java Sales Management System (Infosys Day 1)</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
                <style>
                    body { background-color: #f8fafc; font-family: system-ui, sans-serif; }
                    .bg-gradient-primary { background: linear-gradient(135deg, #4f46e5, #3b82f6); }
                    .fs-7 { font-size: 0.85rem; }
                </style>
            </head>
            <body>
                <nav class="navbar navbar-dark bg-gradient-primary shadow-sm mb-4">
                    <div class="container">
                        <a class="navbar-brand fw-bold" href="/"><i class="fa-solid fa-chart-line me-2"></i>SalesTrack Java Pro (Infosys Day 1)</a>
                        <a class="btn btn-light text-primary rounded-pill fw-bold" href="/add"><i class="fa-solid fa-plus me-1"></i>Add New Sale</a>
                    </div>
                </nav>
                <div class="container pb-5">
                    <!-- Stats Cards -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-3">
                            <div class="card border-0 shadow-sm rounded-4 bg-primary text-white p-3">
                                <div class="fs-7 text-uppercase">Grand Revenue</div>
                                <div class="fs-3 fw-bold">₹%.2f</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-0 shadow-sm rounded-4 bg-success text-white p-3">
                                <div class="fs-7 text-uppercase">Items Sold</div>
                                <div class="fs-3 fw-bold">%d</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-0 shadow-sm rounded-4 bg-info text-white p-3">
                                <div class="fs-7 text-uppercase">Total Transactions</div>
                                <div class="fs-3 fw-bold">%d</div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card border-0 shadow-sm rounded-4 bg-dark text-white p-3">
                                <div class="fs-7 text-uppercase">Avg Sale Value</div>
                                <div class="fs-3 fw-bold">₹%.2f</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Table Card -->
                    <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div class="card-header bg-white py-3 px-4 fw-bold fs-5">
                            <i class="fa-solid fa-table me-2 text-primary"></i>Sales Records Table (SQLite)
                        </div>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-dark">
                                    <tr>
                                        <th class="ps-4">ID</th>
                                        <th>Product Name</th>
                                        <th class="text-center">Quantity</th>
                                        <th class="text-end">Unit Price (₹)</th>
                                        <th class="text-end">Total Amount (₹)</th>
                                        <th>Sale Date</th>
                                        <th>Notes</th>
                                        <th class="text-center pe-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    %s
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        """, grandTotal, totalQty, totalTx, avgValue, rowsHtml.toString());
    }

    private static String renderAddSaleHtml() {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Add Sales Record (Java + SQLite)</title>
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
            </head>
            <body class="bg-light">
                <div class="container py-5" style="max-width: 650px;">
                    <a href="/" class="text-decoration-none text-secondary mb-3 d-inline-block">&larr; Back to Dashboard</a>
                    <div class="card border-0 shadow-lg rounded-4">
                        <div class="card-header bg-primary text-white p-4">
                            <h4 class="fw-bold mb-0">Add Sales Record (Java)</h4>
                        </div>
                        <div class="card-body p-4">
                            <form method="POST" action="/add">
                                <div class="mb-3">
                                    <label class="form-label fw-semibold">Product Name *</label>
                                    <input type="text" class="form-control" name="product_name" required placeholder="e.g. Wireless Keyboard" />
                                </div>
                                <div class="row g-3 mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Quantity *</label>
                                        <input type="number" class="form-control" id="qty" name="quantity" min="1" value="1" required />
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-semibold">Price per Unit (₹) *</label>
                                        <input type="number" step="0.01" class="form-control" id="prc" name="price" required placeholder="e.g. 1499.00" />
                                    </div>
                                </div>
                                
                                <!-- Formula Preview -->
                                <div class="card bg-success-subtle p-3 mb-3 border-0 rounded-3">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="fw-bold text-success">Calculated Total (Total = Qty × Price)</span>
                                        <span class="fs-3 fw-bold text-success" id="totalPreview">₹0.00</span>
                                    </div>
                                </div>

                                <div class="mb-4">
                                    <label class="form-label fw-semibold">Notes</label>
                                    <textarea class="form-control" name="notes" rows="2" placeholder="Optional notes..."></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold rounded-pill">Save Sales Record</button>
                            </form>
                        </div>
                    </div>
                </div>
                <script>
                    const qty = document.getElementById('qty');
                    const prc = document.getElementById('prc');
                    const prev = document.getElementById('totalPreview');
                    function update() {
                        const total = (parseFloat(qty.value)||0) * (parseFloat(prc.value)||0);
                        prev.textContent = '₹' + total.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    }
                    qty.addEventListener('input', update);
                    prc.addEventListener('input', update);
                </script>
            </body>
            </html>
        """;
    }

    // Helper Utilities
    private static Map<String, String> parseFormData(InputStream body) throws IOException {
        String str = new String(body.readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> map = new HashMap<>();
        if (str.isEmpty()) return map;

        for (String pair : str.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8), URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    private static void sendHtmlResponse(HttpExchange exchange, String html) throws IOException {
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    record SaleRecord(int id, String productName, int quantity, double price, double totalAmount, String saleDate, String notes) {}
}
