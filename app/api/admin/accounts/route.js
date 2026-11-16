import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';
import { normalizePhone } from '../../../../lib/customer-auth.mjs';
import { orderReference } from '../../../../lib/order-reference.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in as admin.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all' | 'active' | 'purchased' | 'banned'
    const query = (searchParams.get('q') || '').trim().toLowerCase();

    // 1. Fetch all customer accounts
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch all paid orders
    const paidOrders = await prisma.order.findMany({
      where: { status: 'paid' },
      select: {
        id: true,
        orderNumber: true,
        receipt: true,
        phone: true,
        customerName: true,
        email: true,
        address: true,
        pincode: true,
        total: true,
        subtotal: true,
        fulfillmentStatus: true,
        paidAt: true,
        createdAt: true,
        itemsJson: true,
      },
      orderBy: { paidAt: 'desc' }
    });

    // 3. Map orders by normalized phone
    const ordersByPhone = new Map();
    for (const order of paidOrders) {
      const norm = normalizePhone(order.phone);
      if (!norm) continue;
      if (!ordersByPhone.has(norm)) {
        ordersByPhone.set(norm, []);
      }
      ordersByPhone.get(norm).push(order);
    }

    const now = Date.now();
    const ACTIVE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes for "Active Now / Logged In"
    const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours for "Active Recently"

    let totalLtvPaise = 0;
    let activeNowCount = 0;
    let activeRecentlyCount = 0;
    let bannedCount = 0;

    const accounts = customers.map(cust => {
      const normPhone = normalizePhone(cust.phone);
      const orders = ordersByPhone.get(normPhone) || [];

      // Calculate Lifetime Value (sum of paid orders in paise)
      const ltvPaise = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      totalLtvPaise += ltvPaise;

      // Last purchase time
      let lastPurchasedAt = null;
      if (orders.length > 0) {
        lastPurchasedAt = orders[0].paidAt || orders[0].createdAt;
      }

      // Address & email resolution
      let email = null;
      let address = null;
      for (const o of orders) {
        if (!email && o.email) email = o.email;
        if (!address && o.address) address = o.address;
        if (email && address) break;
      }

      // Activity calculation
      const lastActiveTime = cust.lastActiveAt ? new Date(cust.lastActiveAt).getTime() : null;
      const isActiveNow = Boolean(lastActiveTime && (now - lastActiveTime) <= ACTIVE_THRESHOLD_MS);
      const isActiveRecently = Boolean(lastActiveTime && (now - lastActiveTime) <= RECENT_THRESHOLD_MS);

      if (isActiveNow) activeNowCount++;
      if (isActiveRecently) activeRecentlyCount++;
      if (cust.isBanned) bannedCount++;

      // Formatted recent orders (max 5)
      const recentOrders = orders.slice(0, 5).map(o => {
        let itemCount = 0;
        try {
          const items = JSON.parse(o.itemsJson || '[]');
          itemCount = items.reduce((sum, item) => sum + (item.qty || 1), 0);
        } catch {
          itemCount = 1;
        }

        return {
          id: o.id,
          orderNumber: o.orderNumber,
          receipt: orderReference(o),
          total: o.total / 100,
          totalPaise: o.total,
          fulfillmentStatus: o.fulfillmentStatus,
          itemCount,
          date: o.paidAt || o.createdAt,
        };
      });

      return {
        id: cust.id,
        phone: cust.phone,
        name: cust.name || '',
        state: cust.state || '',
        pincode: cust.pincode || '',
        email: email || '',
        address: address || '',
        isBanned: Boolean(cust.isBanned),
        banReason: cust.banReason || null,
        bannedAt: cust.bannedAt || null,
        lastActiveAt: cust.lastActiveAt || null,
        lastLoginAt: cust.lastLoginAt || null,
        createdAt: cust.createdAt,
        isActiveNow,
        isActiveRecently,
        lifetimeValue: ltvPaise / 100,
        lifetimeValuePaise: ltvPaise,
        totalOrders: orders.length,
        lastPurchasedAt,
        recentOrders,
      };
    });

    // Filter accounts based on query params
    let filtered = accounts;

    if (filter === 'active') {
      filtered = filtered.filter(a => a.isActiveNow || a.isActiveRecently);
    } else if (filter === 'purchased') {
      filtered = filtered.filter(a => a.totalOrders > 0);
    } else if (filter === 'banned') {
      filtered = filtered.filter(a => a.isBanned);
    }

    if (query) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.phone.includes(query) ||
        a.state.toLowerCase().includes(query) ||
        a.pincode.includes(query) ||
        (a.email && a.email.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({
      success: true,
      accounts: filtered,
      summary: {
        totalAccounts: customers.length,
        activeNowCount,
        activeRecentlyCount,
        bannedCount,
        totalLtv: totalLtvPaise / 100,
      }
    });
  } catch (error) {
    console.error('Admin accounts GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch accounts.' }, { status: 500 });
  }
}
