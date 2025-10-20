import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const generatePDF = (order, items, companySettings) => {
    const doc = new jsPDF();
    const primaryColor = companySettings?.primary_color || '#3b82f6';
    const accentColor = companySettings?.accent_color || '#0f172a';
    const logoUrl = companySettings?.erp_logo_url;
    
    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, 'F');
    
    if (logoUrl) {
        doc.addImage(logoUrl, 'PNG', 14, 5, 20, 20);
    }
    
    doc.setFontSize(18);
    doc.setTextColor('#FFFFFF');
    doc.setFont('helvetica', 'bold');
    doc.text(companySettings?.company_name || 'Mi Empresa', 40, 16);

    // Order Info
    doc.setFontSize(22);
    doc.setTextColor(accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Orden de Producción: ${order.code}`, 14, 40);

    doc.setFontSize(12);
    doc.setTextColor('#000000');
    doc.setFont('helvetica', 'normal');
    doc.text(`Producto: ${order.products.name}`, 14, 50);
    doc.text(`Referencia: ${order.products.reference}`, 14, 57);
    doc.text(`Fecha de Entrega: ${order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}`, 14, 64);
    doc.text(`Estado: ${order.status}`, 14, 71);

    // Table of Items
    const tableColumn = ["Talla", "Color", "Cantidad"];
    const tableRows = [];

    items.forEach(item => {
        const itemData = [
            item.size,
            item.color,
            item.quantity,
        ];
        tableRows.push(itemData);
    });
    
    tableRows.push(['', 'TOTAL', order.total_quantity]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'grid',
        headStyles: {
            fillColor: accentColor
        },
        foot: [['', 'Total Unidades', order.total_quantity]],
        footStyles: {
            fontStyle: 'bold',
            fillColor: '#f3f4f6'
        },
        didParseCell: function (data) {
            if (data.row.index === tableRows.length - 1) { // Total row
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // Notes
    let finalY = doc.lastAutoTable.finalY + 10;
    if (order.notes) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Notas:', 14, finalY);
        finalY += 7;
        doc.setFont('helvetica', 'normal');
        const notes = doc.splitTextToSize(order.notes, doc.internal.pageSize.getWidth() - 28);
        doc.text(notes, 14, finalY);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }

    doc.save(`OP-${order.code}.pdf`);
};