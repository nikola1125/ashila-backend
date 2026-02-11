const React = require('react');
const { Document, Page, View, Text, StyleSheet, renderToStream } = require('@react-pdf/renderer');

// Create styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        borderBottomStyle: 'solid',
        paddingBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1f2937',
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 12,
        color: '#111827',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderBottomWidth: 2,
        borderBottomColor: '#dddddd',
        borderBottomStyle: 'solid',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        borderBottomStyle: 'solid',
        padding: 8,
        alignItems: 'center',
    },
    colDescription: { flex: 3 },
    colQty: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 1, textAlign: 'right' },
    colTotal: { flex: 1, textAlign: 'right' },
    itemName: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    itemMeta: {
        fontSize: 9,
        color: '#6b7280',
        marginTop: 2,
    },
    totalSection: {
        marginTop: 30,
        alignItems: 'flex-end',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 200,
        marginBottom: 5,
    },
    totalLabel: {
        fontSize: 11,
        color: '#6b7280',
    },
    totalValue: {
        fontSize: 11,
        color: '#333333',
    },
    grandTotalLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#A67856',
    },
    grandTotalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#A67856',
    },
    footer: {
        marginTop: 50,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        borderTopStyle: 'solid',
        paddingTop: 20,
    },
    footerText: {
        fontSize: 9,
        color: '#9ca3af',
        marginBottom: 4,
    }
});

const InvoiceDocument = ({ order }) => {
    const formatDate = (date) => new Date(date).toLocaleDateString();
    const formatCurrency = (val) => `${(val || 0).toFixed(2)} ALL`;

    return React.createElement(Document, {},
        React.createElement(Page, { size: 'A4', style: styles.page },
            // Header (Matching Email Style)
            React.createElement(View, { style: { ...styles.header, backgroundColor: '#A67856', padding: 25, borderBottomWidth: 0 } },
                React.createElement(Text, { style: { ...styles.title, color: '#ffffff', textAlign: 'center', marginBottom: 5 } }, 'INVOICE DETAILS'),
                React.createElement(Text, { style: { fontSize: 12, color: '#e0e0e0', textAlign: 'center' } }, 'Thank you for shopping with Farmaci Ashila')
            ),

            // Invoice Meta
            React.createElement(View, { style: { ...styles.header, marginTop: 20 } },
                React.createElement(View, { style: styles.headerRow },
                    React.createElement(View, {},
                        React.createElement(Text, { style: { ...styles.title, fontSize: 18, color: '#A67856' } }, `INVOICE #${order.orderNumber || order._id}`),
                        React.createElement(Text, { style: styles.itemMeta }, `Date: ${formatDate(order.createdAt || Date.now())}`),
                        React.createElement(Text, { style: { ...styles.itemMeta, color: order.paymentStatus === 'paid' ? '#2ecc71' : '#e74c3c', fontWeight: 'bold' } },
                            `Status: ${order.paymentStatus?.toUpperCase() || 'CONFIRMED'}`
                        )
                    ),
                    React.createElement(View, { style: { textAlign: 'right' } },
                        React.createElement(Text, { style: { ...styles.value, fontWeight: 'bold' } }, 'Farmaci Ashila'),
                        React.createElement(Text, { style: styles.itemMeta }, 'Lezhe, Albania'),
                        React.createElement(Text, { style: styles.itemMeta }, 'noreply@farmaciashila.com')
                    )
                )
            ),

            // Billing Info
            React.createElement(View, { style: styles.section },
                React.createElement(Text, { style: styles.label }, 'Billed To'),
                React.createElement(Text, { style: { ...styles.value, fontWeight: 'bold' } }, order.buyerName || 'Valued Customer'),
                React.createElement(Text, { style: styles.value }, order.buyerEmail),
                order.deliveryAddress && React.createElement(Text, { style: styles.itemMeta },
                    `${order.deliveryAddress.street || ''}\n${order.deliveryAddress.city || ''}, ${order.deliveryAddress.postalCode || ''}\n${order.deliveryAddress.phoneNumber || ''}`
                )
            ),

            // Table Header
            React.createElement(View, { style: { ...styles.tableHeader, marginTop: 20 } },
                React.createElement(Text, { style: [styles.label, styles.colDescription] }, 'Item'),
                React.createElement(Text, { style: [styles.label, styles.colQty] }, 'Qty'),
                React.createElement(Text, { style: [styles.label, styles.colPrice] }, 'Price'),
                React.createElement(Text, { style: [styles.label, styles.colTotal] }, 'Total')
            ),

            // Table Rows
            ...(order.items || []).map(item =>
                React.createElement(View, { key: item._id || Math.random(), style: styles.tableRow },
                    React.createElement(View, { style: styles.colDescription },
                        React.createElement(Text, { style: styles.itemName }, item.itemName || item.name),
                        item.discount > 0 && React.createElement(Text, { style: styles.itemMeta }, `Discount: ${item.discount}%`)
                    ),
                    React.createElement(Text, { style: [styles.value, styles.colQty] }, item.quantity),
                    React.createElement(Text, { style: [styles.value, styles.colPrice] }, formatCurrency(item.price * (1 - (item.discount || 0) / 100))),
                    React.createElement(Text, { style: [styles.value, styles.colTotal, { fontWeight: 'bold' }] }, formatCurrency(item.price * (1 - (item.discount || 0) / 100) * item.quantity))
                )
            ),

            // Totals
            React.createElement(View, { style: styles.totalSection },
                React.createElement(View, { style: styles.totalRow },
                    React.createElement(Text, { style: styles.totalLabel }, 'Subtotal:'),
                    React.createElement(Text, { style: styles.totalValue }, formatCurrency(order.totalPrice))
                ),
                order.discountAmount > 0 && React.createElement(View, { style: styles.totalRow },
                    React.createElement(Text, { style: styles.totalLabel }, 'Discount:'),
                    React.createElement(Text, { style: { ...styles.totalValue, color: '#e74c3c' } }, `- ${formatCurrency(order.discountAmount)}`)
                ),
                React.createElement(View, { style: styles.totalRow },
                    React.createElement(Text, { style: styles.totalLabel }, 'Shipping:'),
                    React.createElement(Text, { style: styles.totalValue }, formatCurrency(order.shippingCost))
                ),
                React.createElement(View, { style: { ...styles.totalRow, marginTop: 10, borderTopWidth: 1, borderTopColor: '#A67856', paddingTop: 10 } },
                    React.createElement(Text, { style: styles.grandTotalLabel }, 'TOTAL DUE:'),
                    React.createElement(Text, { style: styles.grandTotalValue }, formatCurrency(order.finalPrice))
                )
            ),

            // Footer
            React.createElement(View, { style: styles.footer },
                React.createElement(Text, { style: styles.footerText }, 'Thank you for shopping with Farmaci Ashila!'),
                React.createElement(Text, { style: { ...styles.footerText, fontSize: 8 } }, 'This is an automated invoice. No signature required.')
            )
        )
    );
};

const generateInvoicePDF = async (order) => {
    const stream = await renderToStream(React.createElement(InvoiceDocument, { order }));
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', err => reject(err));
    });
};

module.exports = { generateInvoicePDF };
