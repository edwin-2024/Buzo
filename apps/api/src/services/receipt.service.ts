import { getSeatTier } from "../lib/seat-pricing";

export interface ReceiptEmailResult {
  success: boolean;
  message: string;
  recipient: string;
  bookingId: string;
}

function escapePdfText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function formatDate(date: any): string {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return String(date);
  }
}

class PdfStreamBuilder {
  private ops: string[] = [];

  setFillColor(r: number, g: number, b: number) {
    this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  }

  setStrokeColor(r: number, g: number, b: number) {
    this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  }

  setLineWidth(w: number) {
    this.ops.push(`${w} w`);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    this.ops.push(`${x} ${y} ${w} ${h} re f`);
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.ops.push(`${x} ${y} ${w} ${h} re S`);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number) {
    this.ops.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  }

  drawText(text: string | number, x: number, y: number, font: "F1" | "F2", size: number) {
    const escaped = escapePdfText(text);
    this.ops.push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escaped}) Tj ET`);
  }

  build(): string {
    return this.ops.join("\n");
  }
}

export class ReceiptService {
  /**
   * Generates a binary PDF Buffer for a given booking record
   */
  generateReceiptPdf(booking: any): Buffer {
    const seatNumber = booking.seat?.seatNumber ?? 1;
    const tier = getSeatTier(seatNumber);
    const tierName = tier?.name ?? "Standard Seat";
    const perksText = tier?.perks?.join(", ") ?? "Standard comfortable seating";
    const basePrice = tier?.price ?? 599;
    const taxFee = 25;
    const totalAmount = basePrice + taxFee;

    const passengerName = booking.passenger?.name || "Valued Passenger";
    const passengerEmail = booking.passenger?.email || "passenger@buzo.transit";
    const bookingId = booking.id || "N/A";
    const invoiceNumber = `INV-${bookingId.slice(-8).toUpperCase()}`;

    const routeName = booking.trip?.route?.name || "Buzo Intercity Route";
    const busNumber = booking.trip?.bus?.number || "Coach BUS-01";
    const departureTime = formatDate(booking.trip?.departureTime);
    const arrivalTime = formatDate(booking.trip?.arrivalTime);

    const paymentStatus = booking.paymentStatus || "PAID";
    const paymentTimestamp = formatDate(booking.createdAt || Date.now());
    const issueDate = paymentTimestamp.substring(0, 10);

    const builder = new PdfStreamBuilder();

    // Top primary accent bar
    builder.setFillColor(0.12, 0.23, 0.54);
    builder.fillRect(40, 805, 515, 5);

    // Header branding & Document Title
    builder.setFillColor(0.12, 0.23, 0.54);
    builder.drawText("BUZO INTERCITY TRANSIT", 40, 778, "F2", 20);
    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("TAX INVOICE & TRAVEL RECEIPT", 40, 762, "F1", 9.5);

    // Invoice Reference & Date (Right header)
    builder.setFillColor(0.15, 0.18, 0.23);
    builder.drawText(`INVOICE: ${invoiceNumber}`, 360, 778, "F2", 10);
    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText(`Issue Date: ${issueDate}`, 360, 762, "F1", 9);

    // Header divider line
    builder.setStrokeColor(0.85, 0.88, 0.92);
    builder.setLineWidth(1);
    builder.drawLine(40, 746, 555, 746);

    // 1. Passenger & Payment Status Card (Y: 650, height 84)
    builder.setFillColor(0.97, 0.98, 1.0);
    builder.fillRect(40, 650, 515, 84);
    builder.setStrokeColor(0.85, 0.88, 0.92);
    builder.setLineWidth(1);
    builder.strokeRect(40, 650, 515, 84);

    // Left: Passenger Details
    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("PASSENGER DETAILS", 55, 718, "F2", 8.5);
    builder.setFillColor(0.12, 0.15, 0.2);
    builder.drawText(passengerName, 55, 700, "F2", 12);
    builder.setFillColor(0.3, 0.35, 0.4);
    builder.drawText(passengerEmail, 55, 684, "F1", 9.5);
    builder.setFillColor(0.5, 0.55, 0.6);
    builder.drawText(`Booking ID: ${bookingId}`, 55, 668, "F1", 8.5);

    // Right: Payment Confirmation
    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("PAYMENT CONFIRMATION", 360, 718, "F2", 8.5);
    builder.setFillColor(0.09, 0.63, 0.36);
    builder.drawText(`STATUS: ${paymentStatus}`, 360, 698, "F2", 12);
    builder.setFillColor(0.3, 0.35, 0.4);
    builder.drawText("Transaction: Confirmed / Verified", 360, 684, "F1", 9);
    builder.setFillColor(0.5, 0.55, 0.6);
    builder.drawText(`Timestamp: ${paymentTimestamp}`, 360, 668, "F1", 8.5);

    // 2. Journey & Bus Telemetry Card (Y: 546, height 92)
    builder.setFillColor(0.98, 0.98, 0.99);
    builder.fillRect(40, 546, 515, 92);
    builder.setStrokeColor(0.85, 0.88, 0.92);
    builder.setLineWidth(1);
    builder.strokeRect(40, 546, 515, 92);

    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("JOURNEY & COACH SPECIFICATIONS", 55, 622, "F2", 8.5);
    builder.setFillColor(0.12, 0.23, 0.54);
    builder.drawText(routeName, 55, 602, "F2", 13);
    builder.setFillColor(0.2, 0.25, 0.3);
    builder.drawText(`Coach Number: ${busNumber}`, 55, 584, "F1", 10);
    builder.setFillColor(0.5, 0.55, 0.6);
    builder.drawText("Transit Class: Buzo Premium Express Transit", 55, 566, "F1", 8.5);

    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("SCHEDULE", 360, 622, "F2", 8.5);
    builder.setFillColor(0.2, 0.25, 0.3);
    builder.drawText(`Departure: ${departureTime}`, 360, 602, "F1", 9.5);
    builder.drawText(`Arrival: ${arrivalTime}`, 360, 584, "F1", 9.5);
    builder.setFillColor(0.5, 0.55, 0.6);
    builder.drawText("Bay: Intercity Express Terminal Bay 4", 360, 566, "F1", 8.5);

    // 3. Seat & Fare Itemization Table
    // Header
    builder.setFillColor(0.12, 0.23, 0.54);
    builder.fillRect(40, 502, 515, 26);
    builder.setFillColor(1, 1, 1);
    builder.drawText("ITEM DESCRIPTION / SEAT ALLOCATION", 55, 511, "F2", 9);
    builder.drawText("SEAT TIER & PERKS", 270, 511, "F2", 9);
    builder.drawText("AMOUNT", 475, 511, "F2", 9);

    // Row 1: Seat & Tier Breakdown (Y: 432, height 70)
    builder.setFillColor(1, 1, 1);
    builder.fillRect(40, 432, 515, 70);
    builder.setStrokeColor(0.85, 0.88, 0.92);
    builder.setLineWidth(1);
    builder.strokeRect(40, 432, 515, 70);

    builder.setFillColor(0.12, 0.15, 0.2);
    builder.drawText(`Seat ${seatNumber}`, 55, 480, "F2", 11);
    builder.setFillColor(0.45, 0.5, 0.55);
    builder.drawText("Single Reserved Passenger Seat", 55, 464, "F1", 8.5);
    builder.drawText("Includes guaranteed boarding allocation", 55, 450, "F1", 8);

    builder.setFillColor(0.85, 0.47, 0.02);
    builder.drawText(tierName, 270, 480, "F2", 10.5);
    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText(`Perks: ${perksText}`, 270, 464, "F1", 8.5);
    builder.drawText("Priority access & verified amenities", 270, 450, "F1", 8);

    builder.setFillColor(0.12, 0.15, 0.2);
    builder.drawText(`INR ${basePrice}.00`, 470, 480, "F2", 11);

    // Row 2: Taxes & Digital Processing Fee (Y: 394, height 38)
    builder.setFillColor(0.98, 0.98, 0.99);
    builder.fillRect(40, 394, 515, 38);
    builder.setStrokeColor(0.85, 0.88, 0.92);
    builder.setLineWidth(1);
    builder.strokeRect(40, 394, 515, 38);

    builder.setFillColor(0.2, 0.25, 0.3);
    builder.drawText("Platform Fee & Statutory Taxes", 55, 413, "F1", 9.5);
    builder.setFillColor(0.5, 0.55, 0.6);
    builder.drawText("Statutory Transit GST (5%) & Digital Convenience", 270, 413, "F1", 8.5);
    builder.setFillColor(0.2, 0.25, 0.3);
    builder.drawText(`INR ${taxFee}.00`, 470, 413, "F1", 9.5);

    // Row 3: Total Paid Box (Y: 348, height 46)
    builder.setFillColor(0.93, 0.95, 0.98);
    builder.fillRect(40, 348, 515, 46);
    builder.setStrokeColor(0.12, 0.23, 0.54);
    builder.setLineWidth(1.5);
    builder.strokeRect(40, 348, 515, 46);

    builder.setFillColor(0.12, 0.23, 0.54);
    builder.drawText("TOTAL AMOUNT PAID", 55, 366, "F2", 12);
    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("(All applicable statutory taxes and convenience fees included)", 210, 366, "F1", 8);
    builder.setFillColor(0.12, 0.23, 0.54);
    builder.drawText(`INR ${totalAmount}.00`, 460, 366, "F2", 13);

    // 4. Transit Guidelines & Terms (Y: 236, height 96)
    builder.setFillColor(0.99, 0.99, 0.99);
    builder.fillRect(40, 236, 515, 96);
    builder.setStrokeColor(0.88, 0.9, 0.94);
    builder.setLineWidth(1);
    builder.strokeRect(40, 236, 515, 96);

    builder.setFillColor(0.4, 0.45, 0.5);
    builder.drawText("IMPORTANT INFORMATION & TRANSIT TERMS", 55, 316, "F2", 8.5);
    builder.setFillColor(0.35, 0.4, 0.45);
    builder.drawText("1. Please arrive at the departure bay at least 15 minutes before scheduled departure.", 55, 300, "F1", 8);
    builder.drawText("2. A valid government photo ID must accompany this receipt during boarding inspection.", 55, 286, "F1", 8);
    builder.drawText("3. Baggage allowance is limited to 15 kg personal luggage and 1 carry-on piece.", 55, 272, "F1", 8);
    builder.drawText("4. Cancellations & refunds are governed strictly by Buzo Intercity Transit rules.", 55, 258, "F1", 8);
    builder.drawText("5. For live bus telemetry updates, visit buzo.com or use the Buzo mobile web app.", 55, 244, "F1", 8);

    // 5. Support & Legal Footer (Y: 130 to 220)
    builder.setStrokeColor(0.85, 0.88, 0.92);
    builder.setLineWidth(1);
    builder.drawLine(40, 218, 555, 218);

    builder.setFillColor(0.15, 0.18, 0.23);
    builder.drawText("Buzo Customer Support & Assistance:", 40, 198, "F2", 8.5);
    builder.setFillColor(0.35, 0.4, 0.45);
    builder.drawText("Toll-Free Helpline: 1800-BUZO-BUS  |  Email: support@buzo.com  |  Website: https://buzo.com", 40, 182, "F1", 8.5);
    builder.setFillColor(0.5, 0.55, 0.6);
    builder.drawText("Notice: This is a computer-generated tax invoice and requires no physical signature. Boarding pass must be presented upon boarding.", 40, 164, "F1", 7.5);
    builder.drawText("Buzo Intercity Transit Technologies Pvt. Ltd. - All Rights Reserved.", 40, 148, "F1", 7.5);

    const contentStream = builder.build();
    return this.assemblePdfBuffer(contentStream);
  }

  /**
   * Simulates email receipt dispatch with logging and metadata confirmation
   */
  async sendReceiptEmail(booking: any): Promise<ReceiptEmailResult> {
    const recipient = booking.passenger?.email || "unknown@buzo.transit";
    const bookingId = booking.id;

    console.log(
      `[ReceiptService] Dispatched booking receipt email for booking ${bookingId} to ${recipient}`
    );

    return {
      success: true,
      message: "Receipt sent to passenger email",
      recipient,
      bookingId,
    };
  }

  private assemblePdfBuffer(contentStream: string): Buffer {
    const streamBytes = Buffer.from(contentStream, "utf-8");
    const streamLength = streamBytes.length;

    const header = "%PDF-1.4\n";
    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    const obj3 =
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n";
    const obj4Start = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
    const obj4End = "\nendstream\nendobj\n";
    const obj5 =
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
    const obj6 =
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";

    const headerBuf = Buffer.from(header, "utf-8");
    const obj1Buf = Buffer.from(obj1, "utf-8");
    const obj2Buf = Buffer.from(obj2, "utf-8");
    const obj3Buf = Buffer.from(obj3, "utf-8");
    const obj4StartBuf = Buffer.from(obj4Start, "utf-8");
    const obj4EndBuf = Buffer.from(obj4End, "utf-8");
    const obj5Buf = Buffer.from(obj5, "utf-8");
    const obj6Buf = Buffer.from(obj6, "utf-8");

    const offset1 = headerBuf.length;
    const offset2 = offset1 + obj1Buf.length;
    const offset3 = offset2 + obj2Buf.length;
    const offset4 = offset3 + obj3Buf.length;
    const offset5 =
      offset4 + obj4StartBuf.length + streamBytes.length + obj4EndBuf.length;
    const offset6 = offset5 + obj5Buf.length;
    const xrefOffset = offset6 + obj6Buf.length;

    const formatOffset = (n: number) => String(n).padStart(10, "0");

    const xref = [
      "xref\n0 7\n",
      "0000000000 65535 f \r\n",
      `${formatOffset(offset1)} 00000 n \r\n`,
      `${formatOffset(offset2)} 00000 n \r\n`,
      `${formatOffset(offset3)} 00000 n \r\n`,
      `${formatOffset(offset4)} 00000 n \r\n`,
      `${formatOffset(offset5)} 00000 n \r\n`,
      `${formatOffset(offset6)} 00000 n \r\n`,
    ].join("");

    const trailer = [
      "trailer\n",
      "<< /Size 7 /Root 1 0 R >>\n",
      "startxref\n",
      `${xrefOffset}\n`,
      "%%EOF\n",
    ].join("");

    return Buffer.concat([
      headerBuf,
      obj1Buf,
      obj2Buf,
      obj3Buf,
      obj4StartBuf,
      streamBytes,
      obj4EndBuf,
      obj5Buf,
      obj6Buf,
      Buffer.from(xref, "utf-8"),
      Buffer.from(trailer, "utf-8"),
    ]);
  }
}

export const receiptService = new ReceiptService();
