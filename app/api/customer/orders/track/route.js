import { NextResponse } from 'next/server';
import { getCustomerFromRequest } from '../../../../../lib/customer-session.mjs';
import { prisma } from '../../../../../lib/prisma';
import { orderReference } from '../../../../../lib/order-reference.mjs';
import { orderStageIndex, orderStages } from '../../../../../lib/order-status.mjs';
import { normalizePhone } from '../../../../../lib/customer-auth.mjs';

export async function POST(request) {
  try {
    const session = await getCustomerFromRequest(request);
    if (!session || !session.phone) {
      return NextResponse.json({
        success: false,
        message: 'You must be logged in to track your order. Please sign in or create an account.'
      }, { status: 401 });
    }

    const body = await request.json();
    const { trackingId, phone } = body;

    if (!trackingId || typeof trackingId !== 'string' || !trackingId.trim()) {
      return NextResponse.json({ success: false, message: 'Please enter a valid Tracking ID or Order Reference (e.g., SK-1001).' }, { status: 400 });
    }

    const inputPhone = normalizePhone(phone || session.phone);
    if (!inputPhone) {
      return NextResponse.json({ success: false, message: 'Please enter your 10-digit phone number associated with the order.' }, { status: 400 });
    }

    const rawId = trackingId.trim();
    // Normalize order number, e.g. "SK-1001", "sk-1001", "INV-SK-1001", "1001"
    const skMatch = rawId.match(/(?:SK-|sk-|INV-SK-)?(\d+)/i);
    const parsedNumber = skMatch ? parseInt(skMatch[1], 10) : null;

    let order = null;
    if (parsedNumber && parsedNumber >= 1000) {
      order = await prisma.order.findUnique({
        where: { orderNumber: parsedNumber }
      });
    }

    if (!order) {
      order = await prisma.order.findUnique({
        where: { receipt: rawId }
      });
    }

    if (!order) {
      order = await prisma.order.findUnique({
        where: { id: rawId }
      });
    }

    if (!order) {
      return NextResponse.json({
        success: false,
        message: `No order found for Tracking ID "${rawId}". Please verify your reference number (e.g., SK-1001) and try again.`
      }, { status: 404 });
    }

    // Verify phone number matches order
    const orderPhoneNormalized = normalizePhone(order.phone);
    if (orderPhoneNormalized !== inputPhone) {
      return NextResponse.json({
        success: false,
        message: 'The phone number does not match this order. Please enter the exact phone number used during checkout.'
      }, { status: 403 });
    }

    let items = [];
    try {
      items = JSON.parse(order.itemsJson || '[]');
    } catch {
      items = [];
    }

    const currentStageIndex = orderStageIndex(order.fulfillmentStatus);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        reference: orderReference(order),
        receipt: order.receipt,
        fulfillmentStatus: order.fulfillmentStatus,
        stageIndex: currentStageIndex,
        stages: orderStages,
        status: order.status,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        pincode: order.pincode,
        items,
        subtotal: order.subtotal / 100,
        shipping: order.shipping / 100,
        total: order.total / 100,
        paymentMode: order.paymentMode,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    });
  } catch (error) {
    console.error('Order tracking error:', error);
    return NextResponse.json({ success: false, message: 'An error occurred while tracking your order. Please try again.' }, { status: 500 });
  }
}
