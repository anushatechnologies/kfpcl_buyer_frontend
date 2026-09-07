import type { CartItem } from "../store/cartStore";
import type { Coupon, PlacedOrder, Product } from "../types/storefront";
import { rankProductsForSearch } from "./smartSearch";
import { formatCurrency, formatPaymentMethodLabel } from "./storefrontUtils";

export const RECENT_SEARCHES_KEY = "kfpcl.recent-searches";
export const NOTIFY_REQUESTS_KEY = "kfpcl.notify-requests";

export const getStockLabel = (stock?: number) => {
  const value = Number(stock);
  if (!Number.isFinite(value)) return "Available";
  if (value <= 0) return "Out of stock";
  if (value <= 5) return `Only ${value} left`;
  return "Available";
};

export const getDeliveryEtaText = () => "Delivery in 20-40 mins";

export const getRecentSearches = () => {
  try {
    const value = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 6) as string[] : [];
  } catch {
    return [];
  }
};

export const saveRecentSearch = (query: string) => {
  const keyword = query.trim();
  if (!keyword) return;
  const next = [keyword, ...getRecentSearches().filter((item) => item.toLowerCase() !== keyword.toLowerCase())].slice(0, 6);
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
};

export const saveNotifyRequest = (payload: { productId: number; variantId?: number | null; productName: string }) => {
  try {
    const existing = JSON.parse(window.localStorage.getItem(NOTIFY_REQUESTS_KEY) || "[]");
    const rows = Array.isArray(existing) ? existing : [];
    const next = [
      {
        ...payload,
        createdAt: new Date().toISOString(),
      },
      ...rows.filter((item) => item?.productId !== payload.productId || item?.variantId !== payload.variantId),
    ].slice(0, 30);
    window.localStorage.setItem(NOTIFY_REQUESTS_KEY, JSON.stringify(next));
  } catch {
    // Notify requests are a convenience layer and should never block shopping.
  }
};

export const getBestCoupon = (coupons: Coupon[], subtotal: number) =>
  coupons
    .filter((coupon) => coupon.isActive !== false && subtotal >= Number(coupon.minCartValue || 0))
    .map((coupon) => {
      const rawDiscount =
        coupon.discountType === "PERCENTAGE"
          ? subtotal * (Number(coupon.discountValue || 0) / 100)
          : Number(coupon.discountValue || 0);
      const discount = coupon.maxDiscountAmount ? Math.min(rawDiscount, Number(coupon.maxDiscountAmount)) : rawDiscount;
      return { coupon, discount };
    })
    .sort((left, right) => right.discount - left.discount)[0] || null;

interface CartWarning {
  variantId: number;
  tone: "danger" | "warning";
  title: string;
  message: string;
  action: "remove" | "adjust" | "none";
  quantity?: number;
}

export const buildCartWarnings = (cart: CartItem[]): CartWarning[] =>
  cart.flatMap((item): CartWarning[] => {
    const stock = Number(item.stock);
    if (!Number.isFinite(stock)) return [];
    if (stock <= 0) {
      return [{
        variantId: item.variantId,
        tone: "danger" as const,
        title: `${item.name} is unavailable`,
        message: "Remove it from cart or pick a substitute before checkout.",
        action: "remove" as const,
      }];
    }
    if (item.quantity > stock) {
      return [{
        variantId: item.variantId,
        tone: "danger" as const,
        title: `Only ${stock} available`,
        message: `Your cart has ${item.quantity}. Adjust to available stock in one tap.`,
        action: "adjust" as const,
        quantity: stock,
      }];
    }
    if (stock <= 5) {
      return [{
        variantId: item.variantId,
        tone: "warning" as const,
        title: `Only ${stock} left`,
        message: "Low stock item. Place the order soon to reserve it.",
        action: "none" as const,
      }];
    }
    return [];
  });

const orderItems = (order: PlacedOrder) => {
  if (order.items?.length) return order.items;
  return (order.storeGroups || []).flatMap((group) => group.items || []);
};

const formatInvoiceDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const money = (value?: number) => Number(value || 0).toFixed(2);

const addressText = (order: PlacedOrder) => [
  order.address?.flatNumber,
  order.address?.addressLine1,
  order.address?.addressLine2,
  order.address?.landmark,
  order.address?.city,
  order.address?.state,
  order.address?.postalCode,
].filter(Boolean).join(", ");

const invoiceRows = (order: PlacedOrder) => orderItems(order).map((item) => {
  const total = Number(item.totalPrice || item.unitPrice * item.quantity || 0);
  const gstRate = Number(item.gstRate || 0);
  const taxable = Number(item.taxableAmount || (gstRate > 0 ? total / (1 + gstRate / 100) : total));
  const totalTax = Number(item.totalTaxAmount || Math.max(total - taxable, 0));
  const cgstRate = Number(item.cgstRate || (item.igstRate ? 0 : gstRate / 2));
  const sgstRate = Number(item.sgstRate || (item.igstRate ? 0 : gstRate / 2));
  const igstRate = Number(item.igstRate || 0);
  const cgstAmount = Number(item.cgstAmount || (igstRate ? 0 : totalTax / 2));
  const sgstAmount = Number(item.sgstAmount || (igstRate ? 0 : totalTax / 2));
  const igstAmount = Number(item.igstAmount || (igstRate ? totalTax : 0));

  return {
    ...item,
    total,
    gstRate,
    taxable,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
  };
});

const invoiceTotals = (order: PlacedOrder) => {
  const rows = invoiceRows(order);
  const taxable = rows.reduce((sum, item) => sum + item.taxable, 0);
  const cgst = rows.reduce((sum, item) => sum + item.cgstAmount, 0);
  const sgst = rows.reduce((sum, item) => sum + item.sgstAmount, 0);
  const igst = rows.reduce((sum, item) => sum + item.igstAmount, 0);
  const itemTotal = rows.reduce((sum, item) => sum + item.total, 0);
  const discount = Number(order.discount || 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const platformFee = Number(order.platformFee || 0);
  const handlingCharge = Number(order.handlingCharge || 0);
  const smallCartFee = Number(order.smallCartFee || 0);
  const walletApplied = Number(order.walletApplied || 0);

  return {
    rows,
    taxable: Number(order.taxableAmount || taxable),
    cgst: Number(order.cgstAmount || cgst),
    sgst: Number(order.sgstAmount || sgst),
    igst: Number(order.igstAmount || igst),
    itemTotal: Number(order.subtotal || itemTotal),
    discount,
    deliveryCharge,
    platformFee,
    handlingCharge,
    smallCartFee,
    walletApplied,
    totalCharges: deliveryCharge + platformFee + handlingCharge + smallCartFee,
    invoiceValue: Number(order.grandTotal || itemTotal + deliveryCharge + platformFee + handlingCharge + smallCartFee - discount),
    amountPayable: Math.max(0, Number(order.grandTotal || itemTotal) - walletApplied),
  };
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const wrapCanvasText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      line = next;
      return;
    }
    if (line) lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((entry, index) => {
    context.fillText(entry, x, y + index * lineHeight);
  });
  return Math.min(lines.length, maxLines) * lineHeight;
};

const getWrappedLines = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 10,
) => {
  const rawLines = String(text || "").split(/\n/);
  const lines: string[] = [];

  rawLines.forEach((rawLine) => {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }

    let line = "";
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width <= maxWidth) {
        line = next;
        return;
      }
      if (line) lines.push(line);
      line = word;
    });
    if (line) lines.push(line);
  });

  return lines.slice(0, maxLines);
};

const drawWrappedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 10,
) => {
  const lines = getWrappedLines(context, text, maxWidth, maxLines);
  lines.forEach((entry, index) => {
    context.fillText(entry, x, y + index * lineHeight);
  });
  return lines.length * lineHeight;
};

const drawRightText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) => {
  const previousAlign = context.textAlign;
  context.textAlign = "right";
  context.fillText(text, x, y);
  context.textAlign = previousAlign;
};

const line = (context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
};

const rect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  context.strokeRect(x, y, width, height);
};

const jpegToPdf = (jpegDataUrls: string[]) => {
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  const push = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    parts.push(bytes as any);
    cursor += bytes.length;
  };

  const object = (body: string | Uint8Array, prefix = "", suffix = "") => {
    offsets.push(cursor);
    const number = offsets.length;
    push(`${number} 0 obj\n${prefix}`);
    push(body);
    push(`${suffix}\nendobj\n`);
    return number;
  };

  push("%PDF-1.4\n");
  const catalog = object("<< /Type /Catalog /Pages 2 0 R >>");
  const pageObjects = jpegDataUrls.map((_, index) => 3 + index * 3);
  object(`<< /Type /Pages /Kids [${pageObjects.map((page) => `${page} 0 R`).join(" ")}] /Count ${pageObjects.length} >>`);

  jpegDataUrls.forEach((jpegDataUrl, index) => {
    const binary = atob(jpegDataUrl.split(",")[1] || "");
    const imageBytes = new Uint8Array(binary.length);
    for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) {
      imageBytes[byteIndex] = binary.charCodeAt(byteIndex);
    }

    const pageObjectNumber = pageObjects[index];
    const imageObjectNumber = pageObjectNumber + 1;
    const contentObjectNumber = pageObjectNumber + 2;
    object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${index} ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    object(imageBytes, `<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`, "\nendstream");
    const content = `q\n595.28 0 0 841.89 0 0 cm\n/Im${index} Do\nQ\n`;
    object(content, `<< /Length ${content.length} >>\nstream\n`, "endstream");
  });

  const xrefOffset = cursor;
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((offset) => push(`${String(offset).padStart(10, "0")} 00000 n \n`));
  push(`trailer\n<< /Size ${offsets.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(parts, { type: "application/pdf" });
};

export const downloadInvoicePdf = async (order: PlacedOrder) => {
  const scale = 2;
  const width = 595;
  const height = 842;
  const margin = 28;
  const pageBottom = 792;
  const tableX = margin;
  const tableW = width - margin * 2;
  const buyerAddress = addressText(order) || "Customer address";
  const totals = invoiceTotals(order);
  const logo = await loadImage("/brand-logo.png");

  const columns = [
    { label: "SR\nNo", width: 24 },
    { label: "Item & Description", width: 142 },
    { label: "HSN", width: 36 },
    { label: "Qty", width: 28 },
    { label: "Rate", width: 44 },
    { label: "Disc.", width: 32 },
    { label: "Taxable\nAmt.", width: 52 },
    { label: "CGST", width: 39 },
    { label: "S/UT\nGST", width: 39 },
    { label: "Cess", width: 24 },
    { label: "Total\nAmt.", width: 71 },
  ];

  const pages: HTMLCanvasElement[] = [];
  let pageContext!: CanvasRenderingContext2D;
  let y = 0;

  const drawTableHeader = (context: CanvasRenderingContext2D, top: number) => {
    context.fillStyle = "#eef5ff";
    context.fillRect(tableX, top, tableW, 34);
    context.strokeStyle = "#1f2a44";
    rect(context, tableX, top, tableW, 34);
    context.fillStyle = "#12213f";
    context.font = "bold 7px Arial";
    let x = tableX;
    columns.forEach((column, index) => {
      if (index) line(context, x, top, x, top + 34);
      drawWrappedText(context, column.label, x + 3, top + 12, column.width - 6, 8, 2);
      x += column.width;
    });
    return top + 34;
  };

  const drawPageFooter = (context: CanvasRenderingContext2D, pageNumber: number) => {
    context.strokeStyle = "#d8deea";
    line(context, margin, 810, width - margin, 810);
    context.fillStyle = "#697386";
    context.font = "7px Arial";
    context.fillText("Computer generated invoice. Prices are inclusive of applicable GST.", margin, 824);
    drawRightText(context, `Page ${pageNumber}`, width - margin, 824);
  };

  const createPage = (continuation = false) => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = "#1f2a44";
    context.fillStyle = "#111827";
    context.textBaseline = "alphabetic";

    if (logo) {
      context.drawImage(logo, margin, 24, 56, 56);
    }

    context.font = "bold 17px Arial";
    context.fillStyle = "#101828";
    context.fillText(order.sellerName || "Karthikeya Farmer Producer Company Limited", 92, 39);
    context.font = "8.5px Arial";
    context.fillStyle = "#344054";
    drawWrappedText(
      context,
      order.sellerAddress || "Manjeera Trinity 501, Manjeera Trinity Corporate, eSeva Ln, Kukatpally Housing Board Colony, KPHB Phase 3, Kukatpally, Hyderabad, Telangana 500072",
      92,
      55,
      340,
      10,
      3,
    );
    context.font = "bold 8.5px Arial";
    context.fillStyle = "#101828";
    context.fillText(`GSTIN: ${order.sellerGstin || "36AIJPN3614J1Z4"}`, 92, 91);

    context.font = "bold 9px Arial";
    context.fillStyle = "#175cd3";
    drawRightText(context, "kfpcl.com", width - margin, 38);
    context.fillStyle = "#344054";
    drawRightText(context, "support@kfpcl.com", width - margin, 54);
    drawRightText(context, "Hyderabad, Telangana", width - margin, 70);

    line(context, margin, 112, width - margin, 112);
    context.font = "bold 12px Arial";
    context.fillStyle = "#101828";
    context.textAlign = "center";
    context.fillText(continuation ? "TAX INVOICE / BILL OF SUPPLY (CONTINUED)" : "TAX INVOICE / BILL OF SUPPLY", width / 2, 128);
    context.textAlign = "left";

    let nextY = 140;
    if (!continuation) {
      context.strokeStyle = "#1f2a44";
      rect(context, margin, nextY, tableW, 46);
      line(context, 296, nextY, 296, nextY + 46);
      context.font = "bold 8px Arial";
      context.fillStyle = "#101828";
      context.fillText(`Invoice No.: INV-${order.orderNumber || order.id}`, margin + 10, nextY + 17);
      context.fillText(`Order No.: ${order.orderNumber || order.id}`, margin + 10, nextY + 34);
      context.fillText(`Place Of Supply: ${(order.placeOfSupply || order.address?.state || "Telangana").toUpperCase()} (${order.placeOfSupplyCode || order.sellerStateCode || "36"})`, 306, nextY + 17);
      context.fillText(`Date: ${formatInvoiceDate(order.placedAt || order.createdAt)}`, 306, nextY + 34);

      nextY += 58;
      rect(context, margin, nextY, tableW, 84);
      line(context, 296, nextY, 296, nextY + 84);
      line(context, margin, nextY + 20, width - margin, nextY + 20);
      context.font = "bold 8px Arial";
      context.fillText("Bill To", margin + 10, nextY + 14);
      context.fillText("Ship To", 306, nextY + 14);
      context.font = "8.5px Arial";
      context.fillStyle = "#344054";
      drawWrappedText(context, buyerAddress, margin + 10, nextY + 36, 238, 10, 4);
      drawWrappedText(context, buyerAddress, 306, nextY + 36, 238, 10, 4);
      nextY += 98;
    } else {
      context.font = "8px Arial";
      context.fillStyle = "#344054";
      context.fillText(`Invoice No.: INV-${order.orderNumber || order.id}`, margin, nextY + 12);
      drawRightText(context, `Order No.: ${order.orderNumber || order.id}`, width - margin, nextY + 12);
      nextY += 28;
    }

    y = drawTableHeader(context, nextY);
    pages.push(canvas);
    drawPageFooter(context, pages.length);
    return context;
  };

  const startNewPage = (continuation = false) => {
    const context = createPage(continuation);
    if (!context) return false;
    pageContext = context;
    return true;
  };

  if (!startNewPage(false)) return;

  totals.rows.forEach((item, index) => {
    pageContext.font = "7.2px Arial";
    const description = `${item.productName}${item.variantName ? ` ${item.variantName}` : ""}${item.freeItem ? " (Free item)" : ""}`;
    const descriptionLines = getWrappedLines(pageContext, description, columns[1].width - 6, 4).length;
    const rowH = Math.max(30, descriptionLines * 8 + 14);

    if (y + rowH > pageBottom) {
      startNewPage(true);
    }

    pageContext.strokeStyle = "#c8d0df";
    rect(pageContext, tableX, y, tableW, rowH);
    let x = tableX;
    columns.forEach((column, columnIndex) => {
      if (columnIndex) line(pageContext, x, y, x, y + rowH);
      x += column.width;
    });

    const values = [
      String(index + 1),
      description,
      item.hsnCode || "-",
      String(item.quantity),
      money(item.unitPrice),
      "0.00%",
      money(item.taxable),
      `${money(item.cgstRate)}%\n${money(item.cgstAmount)}`,
      `${money(item.sgstRate)}%\n${money(item.sgstAmount)}`,
      "0.00",
      money(item.total),
    ];

    x = tableX;
    pageContext.fillStyle = "#111827";
    values.forEach((value, columnIndex) => {
      const maxLines = columnIndex === 1 ? 4 : 2;
      drawWrappedText(pageContext, value, x + 3, y + 13, columns[columnIndex].width - 6, 8, maxLines);
      x += columns[columnIndex].width;
    });
    y += rowH;
  });

  const summaryRows = [
    ["Item Total", totals.itemTotal],
    ["Taxable Value", totals.taxable],
    ["CGST", totals.cgst],
    ["S/UT GST", totals.sgst],
    ["IGST", totals.igst],
    ["Discount", -totals.discount],
    ["Delivery Charge", totals.deliveryCharge],
    ["Platform Fee", totals.platformFee],
    ["Handling Charge", totals.handlingCharge],
    ["Small Cart Fee", totals.smallCartFee],
    ["Invoice Value", totals.invoiceValue],
    ["Wallet Applied", -totals.walletApplied],
    ["Amount Payable", totals.amountPayable],
  ].filter((row) => row[0] === "Invoice Value" || row[0] === "Amount Payable" || Number(row[1]) !== 0);

  const finalBlockHeight = summaryRows.length * 16 + 170;
  if (y + finalBlockHeight > pageBottom) {
    startNewPage(true);
  }

  y += 14;
  const summaryX = 340;
  const summaryW = width - margin - summaryX;
  pageContext.strokeStyle = "#1f2a44";
  rect(pageContext, summaryX, y, summaryW, summaryRows.length * 16 + 10);
  pageContext.font = "8px Arial";
  summaryRows.forEach(([label, value], index) => {
    const rowY = y + 18 + index * 16;
    pageContext.fillStyle = label === "Invoice Value" || label === "Amount Payable" ? "#101828" : "#344054";
    pageContext.font = label === "Invoice Value" || label === "Amount Payable" ? "bold 8px Arial" : "8px Arial";
    pageContext.fillText(String(label), summaryX + 10, rowY);
    drawRightText(pageContext, money(Number(value)), summaryX + summaryW - 10, rowY);
  });

  pageContext.font = "8px Arial";
  pageContext.fillStyle = "#344054";
  const notesY = y + summaryRows.length * 16 + 32;
  pageContext.fillText(`Whether GST is payable on reverse-charge - ${order.reverseCharge ? "Yes" : "No"}.`, margin, notesY);
  pageContext.fillText("For item serial / warranty information, please refer to packaging / warranty slip.", margin, notesY + 15);
  pageContext.fillText("Payment Method: " + formatPaymentMethodLabel(order.paymentMethod), margin, notesY + 30);

  pageContext.font = "bold 8px Arial";
  pageContext.fillStyle = "#101828";
  pageContext.fillText("Order Delivered From", margin, notesY + 62);
  pageContext.fillText("E-commerce Platform Information", 318, notesY + 62);
  pageContext.font = "8px Arial";
  pageContext.fillStyle = "#344054";
  drawWrappedText(pageContext, order.sellerName || "Karthikeya Farmer Producer Company Limited", margin, notesY + 77, 235, 10, 1);
  drawWrappedText(
    pageContext,
    order.sellerAddress || "Manjeera Trinity 501, Manjeera Trinity Corporate, KPHB, Hyderabad 500072",
    margin,
    notesY + 90,
    240,
    10,
    4,
  );
  pageContext.fillText("Karthikeya Farmer Producer Company Limited", 318, notesY + 77);
  drawWrappedText(pageContext, "501, Manjeera Trinity Corporate, KPHB, Hyderabad 500072", 318, notesY + 90, 220, 10, 3);
  pageContext.fillText("Email: support@kfpcl.com", 318, notesY + 124);

  pageContext.font = "bold 14px Arial";
  pageContext.fillStyle = "#175cd3";
  drawRightText(pageContext, "Karthikeya Farmer Producer Company Limited", width - margin, notesY + 48);

  const jpegPages = pages.map((page) => page.toDataURL("image/jpeg", 0.92));
  const blob = jpegToPdf(jpegPages);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kfpcl-bazaar-invoice-${order.orderNumber || order.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const buildInvoiceText = (order: PlacedOrder) => {
  const totals = invoiceTotals(order);
  const rows = totals.rows
    .map((item, index) => [
      `${index + 1}. ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}`,
      `   HSN: ${item.hsnCode || "-"} | Qty: ${item.quantity} | Unit: ${formatCurrency(item.unitPrice)} | GST: ${Number(item.gstRate || 0).toFixed(2)}%`,
      `   Taxable: ${formatCurrency(item.taxable)} | CGST: ${formatCurrency(item.cgstAmount)} | SGST: ${formatCurrency(item.sgstAmount)} | IGST: ${formatCurrency(item.igstAmount)} | Total: ${formatCurrency(item.total)}`,
    ].join("\n"))
    .join("\n");

  return [
    "TAX INVOICE / BILL OF SUPPLY",
    "",
    `Seller Name: ${order.sellerName || "Karthikeya Farmer Producer Company Limited"}`,
    `GSTIN: ${order.sellerGstin || "36AIJPN3614J1Z4"}`,
    `Address: ${order.sellerAddress || "Manjeera Trinity 501, Manjeera Trinity Corporate, eSeva Ln, Kukatpally, Hyderabad, Telangana 500072"}`,
    `Place of Supply: ${order.placeOfSupply || order.address?.state || "Telangana"}${order.placeOfSupplyCode ? ` (${order.placeOfSupplyCode})` : ""}`,
    `Reverse Charge: ${order.reverseCharge ? "Yes" : "No"}`,
    "",
    `Order: ${order.orderNumber}`,
    `Date: ${order.placedAt || order.createdAt || ""}`,
    `Payment: ${formatPaymentMethodLabel(order.paymentMethod)}`,
    `Bill To / Ship To: ${addressText(order)}`,
    "",
    rows,
    "",
    `Subtotal: ${formatCurrency(order.subtotal)}`,
    `Taxable value: ${formatCurrency(totals.taxable)}`,
    `CGST: ${formatCurrency(totals.cgst)}`,
    `SGST: ${formatCurrency(totals.sgst)}`,
    `IGST: ${formatCurrency(totals.igst)}`,
    `Total GST: ${formatCurrency(totals.cgst + totals.sgst + totals.igst)}`,
    `Discount: ${formatCurrency(order.discount)}`,
    `Delivery: ${formatCurrency(order.deliveryCharge)}`,
    `Platform fee: ${formatCurrency(order.platformFee)}`,
    `Small cart fee: ${formatCurrency(order.smallCartFee)}`,
    `Grand total: ${formatCurrency(order.grandTotal)}`,
    "",
    "Prices are inclusive of applicable GST.",
  ].join("\n");
};

export const productMatchesKeywords = (product: Product, keywords: string[]) => {
  const query = keywords.filter(Boolean).join(" ").trim();
  if (!query) return false;
  return rankProductsForSearch([product], query, 1).length > 0;
};
