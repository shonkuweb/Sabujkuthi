import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../../lib/admin-session.mjs';
import { createInvoice, invoiceNumber } from '../../../../../../lib/invoice.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Sign in to download invoices.' }, { status: 401 });
  const { id } = await params;
  try {
    const order = await prisma.order.findFirst({ where: { id, status: 'paid' } });
    if (!order) return NextResponse.json({ error: 'Paid order not found.' }, { status: 404 });
    const pdf = await createInvoice({ ...order, items: JSON.parse(order.itemsJson) });
    const filename = `${invoiceNumber(order).replace(/[^A-Za-z0-9_-]/g,'')}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    console.error('Invoice generation failed', { name: error.name });
    return NextResponse.json({ error: 'Unable to generate this invoice. Please try again.' }, { status: 500 });
  }
}
