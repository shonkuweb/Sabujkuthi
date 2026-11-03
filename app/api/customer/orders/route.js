import { NextResponse } from 'next/server';
import { getCustomerFromRequest } from '../../../../lib/customer-session.mjs';
import { prisma } from '../../../../lib/prisma';
import { orderReference } from '../../../../lib/order-reference.mjs';
import { orderStageIndex } from '../../../../lib/order-status.mjs';
import { normalizePhone } from '../../../../lib/customer-auth.mjs';

export async function GET(request) {
  try {
    const session = await getCustomerFromRequest(request);
    if (!session || !session.phone) {
      return NextResponse.json({ success: false, message: 'Please log in to view your orders.' }, { status: 401 });
    }

    const customerPhone = normalizePhone(session.phone);

    // Fetch candidate orders matching phone substring or full match
    const candidates = await prisma.order.findMany({
      where: {
        phone: { contains: customerPhone }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Ensure normalized phone matches exactly
    const matching = candidates.filter(order => normalizePhone(order.phone) === customerPhone);

    const orders = matching.map(order => {
      let items = [];
      try {
        items = JSON.parse(order.itemsJson || '[]');
      } catch {
        items = [];
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        reference: orderReference(order),
        receipt: order.receipt,
        fulfillmentStatus: order.fulfillmentStatus,
        stageIndex: orderStageIndex(order.fulfillmentStatus),
        status: order.status,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        pincode: order.pincode,
        items,
        subtotal: order.subtotal / 100,
        shipping: order.shipping / 100,
        total: order.total / 100,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
      };
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Customer orders error:', error);
    return NextResponse.json({ success: false, message: 'Unable to load orders.' }, { status: 500 });
  }
}
