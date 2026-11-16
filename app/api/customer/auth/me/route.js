import { NextResponse } from 'next/server';
import { getCustomerFromRequest } from '../../../../../lib/customer-session.mjs';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request) {
  try {
    const session = await getCustomerFromRequest(request);
    if (!session || !session.id) {
      return NextResponse.json({ authenticated: false, customer: null });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        phone: true,
        name: true,
        state: true,
        pincode: true,
        isBanned: true,
        banReason: true,
        lastActiveAt: true,
        createdAt: true,
      }
    });

    if (!customer) {
      return NextResponse.json({ authenticated: false, customer: null });
    }

    if (customer.isBanned) {
      const response = NextResponse.json({
        authenticated: false,
        banned: true,
        banReason: customer.banReason,
        customer: null,
      });
      response.cookies.delete('customer_token');
      return response;
    }

    // Keep activity timestamp updated periodically (at most once every 60 seconds)
    if (!customer.lastActiveAt || Date.now() - new Date(customer.lastActiveAt).getTime() > 60000) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastActiveAt: new Date() }
      });
    }

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        createdAt: customer.createdAt,
      }
    });
  } catch (error) {
    console.error('Customer me error:', error);
    return NextResponse.json({ authenticated: false, customer: null }, { status: 500 });
  }
}
