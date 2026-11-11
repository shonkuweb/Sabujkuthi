import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { isAdminRequest } from '../../../../lib/admin-session.mjs';

export const dynamic = 'force-dynamic';

function getDatesRange(period) {
  const now = new Date();
  const points = [];

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      points.push({ key: iso, label });
    }
  } else if (period === 'month') {
    // Current year months
    const year = now.getFullYear();
    for (let m = 0; m <= now.getMonth(); m++) {
      const d = new Date(year, m, 1);
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      points.push({ key, label });
    }
  } else if (period === 'year') {
    // Past 5 years
    const currentYear = now.getFullYear();
    for (let y = currentYear - 4; y <= currentYear; y++) {
      points.push({ key: String(y), label: String(y) });
    }
  } else {
    // Default: '30d'
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      points.push({ key: iso, label });
    }
  }
  return points;
}

export async function GET(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30d';
  const rangePoints = getDatesRange(period);
  const startDateStr = rangePoints[0].key;

  try {
    // Fetch all paid orders
    const paidOrders = await prisma.order.findMany({
      where: { status: 'paid' },
      select: { id: true, total: true, subtotal: true, fulfillmentStatus: true, createdAt: true, paidAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch customers
    const customers = await prisma.customer.findMany({
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch site visits
    const visits = await prisma.siteVisit.findMany({
      orderBy: { date: 'asc' },
    });

    // Map time-series buckets
    const bucketMap = {};
    for (const p of rangePoints) {
      bucketMap[p.key] = {
        key: p.key,
        label: p.label,
        revenue: 0,
        sales: 0,
        accounts: 0,
        visitors: 0,
      };
    }

    let totalRevenuePeriod = 0;
    let totalSalesPeriod = 0;
    let totalAccountsPeriod = 0;
    let totalVisitorsPeriod = 0;

    // Process Orders
    for (const order of paidOrders) {
      const orderDate = new Date(order.paidAt || order.createdAt);
      let bucketKey = orderDate.toISOString().slice(0, 10);
      if (period === 'month') {
        bucketKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'year') {
        bucketKey = String(orderDate.getFullYear());
      }

      if (bucketMap[bucketKey]) {
        const revRupees = Math.round(order.total / 100);
        bucketMap[bucketKey].revenue += revRupees;
        bucketMap[bucketKey].sales += 1;
        totalRevenuePeriod += revRupees;
        totalSalesPeriod += 1;
      }
    }

    // Process Customers
    for (const customer of customers) {
      const cDate = new Date(customer.createdAt);
      let bucketKey = cDate.toISOString().slice(0, 10);
      if (period === 'month') {
        bucketKey = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === 'year') {
        bucketKey = String(cDate.getFullYear());
      }

      if (bucketMap[bucketKey]) {
        bucketMap[bucketKey].accounts += 1;
        totalAccountsPeriod += 1;
      }
    }

    // Process Visits
    for (const v of visits) {
      let bucketKey = v.date;
      if (period === 'month') {
        bucketKey = v.date.slice(0, 7);
      } else if (period === 'year') {
        bucketKey = v.date.slice(0, 4);
      }

      if (bucketMap[bucketKey]) {
        bucketMap[bucketKey].visitors += v.uniqueVisitors || v.count || 1;
        totalVisitorsPeriod += v.uniqueVisitors || v.count || 1;
      }
    }

    const series = rangePoints.map(p => bucketMap[p.key]);

    // Fulfillment status breakdown
    const fulfillmentMap = {};
    for (const order of paidOrders) {
      const status = order.fulfillmentStatus || 'New';
      fulfillmentMap[status] = (fulfillmentMap[status] || 0) + 1;
    }

    return NextResponse.json({
      period,
      summary: {
        totalRevenue: totalRevenuePeriod,
        totalSales: totalSalesPeriod,
        totalAccounts: totalAccountsPeriod,
        totalVisitors: totalVisitorsPeriod,
        allTimeRevenue: Math.round(paidOrders.reduce((sum, o) => sum + o.total, 0) / 100),
        allTimeSales: paidOrders.length,
        allTimeAccounts: customers.length,
        allTimeVisitors: visits.reduce((sum, v) => sum + (v.uniqueVisitors || v.count || 0), 0),
      },
      series,
      fulfillmentBreakdown: fulfillmentMap,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json({ error: 'Unable to load dashboard insights.' }, { status: 500 });
  }
}
