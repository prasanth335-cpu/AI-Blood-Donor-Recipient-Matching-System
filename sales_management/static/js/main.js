/**
 * Infosys Sales Management System - Interactive Frontend Script
 * Calculates real-time total amount (Total = Quantity * Price) as user types.
 */

document.addEventListener('DOMContentLoaded', function () {
    const quantityInput = document.getElementById('quantity');
    const priceInput = document.getElementById('price');
    const liveTotalDisplay = document.getElementById('liveTotalDisplay');

    function calculateTotal() {
        if (!quantityInput || !priceInput || !liveTotalDisplay) return;

        const qty = parseFloat(quantityInput.value) || 0;
        const prc = parseFloat(priceInput.value) || 0;
        
        // Formula: Total = Quantity * Price
        const total = qty * prc;

        // Format to INR currency with comma separators (en-IN) and 2 decimal places
        liveTotalDisplay.textContent = '₹' + total.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    if (quantityInput && priceInput) {
        quantityInput.addEventListener('input', calculateTotal);
        priceInput.addEventListener('input', calculateTotal);
        // Initial calculation on page load (e.g. when editing or validation fail reload)
        calculateTotal();
    }

    // Bootstrap Form Validation feedback
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
});
