import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useOrderDetail, type Order } from "@/hooks/useOrders";
import jsPDF from "jspdf";

interface InvoiceSettings {
  invoice_address?: string | null;
  invoice_payment_terms?: string | null;
  invoice_notes?: string | null;
  invoice_logo_url?: string | null;
}

interface InvoiceGeneratorProps {
  order: Order;
  orgName: string;
  orgSettings?: InvoiceSettings;
}

const InvoiceGenerator = ({ order, orgName, orgSettings }: InvoiceGeneratorProps) => {
  const { items } = useOrderDetail(order.id);

  const generateInvoice = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Logo
    if (orgSettings?.invoice_logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = orgSettings.invoice_logo_url!;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")?.drawImage(img, 0, 0);
        const imgData = canvas.toDataURL("image/png");
        const ratio = img.width / img.height;
        const logoH = 14;
        const logoW = logoH * ratio;
        doc.addImage(imgData, "PNG", 20, y - 5, logoW, logoH);
        y += logoH + 2;
      } catch {
        // Skip logo on error
      }
    }

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(orgName, 20, y);
    y += 8;

    // Invoice address
    if (orgSettings?.invoice_address) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const addrLines = doc.splitTextToSize(orgSettings.invoice_address, 90);
      doc.text(addrLines, 20, y);
      y += addrLines.length * 3.5 + 2;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("INVOICE", pageWidth - 20, 20, { align: "right" });
    doc.setFontSize(8);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 20, 27, { align: "right" });
    doc.text(`Invoice #: INV-${order.order_number}`, pageWidth - 20, 33, { align: "right" });

    // Divider
    y += 3;
    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Order Info
    doc.setTextColor(50);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Order Details", 20, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Order: ${order.order_number}`, 20, y);
    doc.text(`Customer: ${order.customer_profile?.display_name || "Unknown"}`, pageWidth / 2, y);
    y += 5;
    doc.text(`Title: ${order.title}`, 20, y);
    doc.text(`Status: ${order.status}`, pageWidth / 2, y);
    y += 5;
    if (order.due_date) {
      doc.text(`Due: ${new Date(order.due_date).toLocaleDateString()}`, 20, y);
      y += 5;
    }
    y += 5;

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, pageWidth - 40, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Item", 22, y + 5.5);
    doc.text("Qty", 100, y + 5.5);
    doc.text("Unit Price", 120, y + 5.5);
    doc.text("Total", pageWidth - 22, y + 5.5, { align: "right" });
    y += 12;

    // Items
    doc.setFont("helvetica", "normal");
    items.forEach((item) => {
      const lineTotal = item.quantity * Number(item.unit_price);
      doc.text(item.name, 22, y);
      doc.text(String(item.quantity), 100, y);
      doc.text(`${Number(item.unit_price).toLocaleString()} ${order.currency}`, 120, y);
      doc.text(`${lineTotal.toLocaleString()} ${order.currency}`, pageWidth - 22, y, { align: "right" });
      y += 6;

      if (item.fabric_details) {
        doc.setTextColor(120);
        doc.setFontSize(7);
        doc.text(`  ${item.fabric_details}`, 22, y);
        y += 4;
        doc.setTextColor(50);
        doc.setFontSize(8);
      }

      const measurements = item.measurements as Record<string, string> | null;
      if (measurements) {
        const entries = Object.entries(measurements).filter(([, v]) => v && String(v).trim());
        if (entries.length > 0) {
          doc.setTextColor(120);
          doc.setFontSize(7);
          const measStr = entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}cm`).join(" | ");
          doc.text(`  Measurements: ${measStr}`, 22, y);
          y += 5;
          doc.setTextColor(50);
          doc.setFontSize(8);
        }
      }
    });

    // Total
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total:", pageWidth - 70, y);
    doc.text(`${Number(order.total_amount).toLocaleString()} ${order.currency}`, pageWidth - 22, y, { align: "right" });

    // Payment Terms
    if (orgSettings?.invoice_payment_terms) {
      y += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50);
      doc.text("Payment Terms", 20, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      const termLines = doc.splitTextToSize(orgSettings.invoice_payment_terms, pageWidth - 40);
      doc.text(termLines, 20, y);
      y += termLines.length * 3.5;
    }

    // Footer notes
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150);
    const footerText = orgSettings?.invoice_notes || "Thank you for your business!";
    doc.text(footerText, pageWidth / 2, y, { align: "center" });
    doc.text(`Generated by ${orgName}`, pageWidth / 2, y + 4, { align: "center" });

    doc.save(`Invoice-${order.order_number}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={generateInvoice}>
      <FileText size={12} /> Download Invoice
    </Button>
  );
};

export default InvoiceGenerator;
