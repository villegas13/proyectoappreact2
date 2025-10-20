import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateRequisitionPDF = (requisition, items, companySettings) => {
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

    // Document Info
    doc.setFontSize(22);
    doc.setTextColor(accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Requerimiento de Compra`, 14, 40);
    
    doc.setFontSize(12);
    doc.setTextColor('#000000');
    doc.setFont('helvetica', 'normal');
    doc.text(`N°: ${requisition.requisition_number}`, 14, 50);
    doc.text(`Fecha: ${new Date(requisition.created_at).toLocaleDateString()}`, 14, 57);
    doc.text(`OP Asociada: ${requisition.production_orders?.code || 'N/A'}`, 14, 64);
    doc.text(`Solicitante: ${requisition.requester_name || 'N/A'}`, 14, 71);
    doc.text(`Estado: ${requisition.status}`, 14, 78);

    // Table of Items
    const tableColumn = ["Código", "Descripción", "U.M.", "Cantidad", "Proveedor Sugerido", "Observaciones"];
    const tableRows = [];

    items.forEach(item => {
        const itemData = [
            item.inventory_items.reference,
            item.inventory_items.name,
            item.inventory_items.unit_of_measure,
            item.required_quantity,
            item.suggested_supplier_id?.name || 'N/A',
            item.notes || ''
        ];
        tableRows.push(itemData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 88,
        theme: 'grid',
        headStyles: {
            fillColor: accentColor
        },
    });

    let finalY = doc.lastAutoTable.finalY + 15;

    // General Notes
    if (requisition.general_notes) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones Generales:', 14, finalY);
        finalY += 7;
        doc.setFont('helvetica', 'normal');
        const notes = doc.splitTextToSize(requisition.general_notes, doc.internal.pageSize.getWidth() - 28);
        doc.text(notes, 14, finalY);
        finalY += (notes.length * 5) + 10;
    }

    // Signatures
    finalY = Math.max(finalY, doc.internal.pageSize.getHeight() - 60);
    doc.setLineDash([2, 2], 0);
    doc.line(20, finalY, 80, finalY);
    doc.line(120, finalY, 180, finalY);
    doc.setLineDash([], 0);
    doc.setFontSize(10);
    doc.text('Firma Solicitante', 50, finalY + 5, { align: 'center' });
    doc.text('Firma Autorizado', 150, finalY + 5, { align: 'center' });


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

    doc.save(`REQ-${requisition.requisition_number}.pdf`);
};