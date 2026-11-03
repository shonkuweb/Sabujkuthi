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
      select: { id: true, phone: true, name: true, createdAt: true }
    });

    if (!customer) {
      return NextResponse.json({ authenticated: false, customer: null });
    }

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name || '',
        createdAt: customer.createdAt,
      }
    });
  } catch (error) {
    console.error('Customer me error:', error);
    return NextResponse.json({ authenticated: false, customer: null }, { status: 500 });
  }
}
