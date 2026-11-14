import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getAffiliateFromRequest } from '../../../../lib/affiliate-session.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getAffiliateFromRequest(request);
    if (!session?.id) {
      return NextResponse.json({ success: false, message: 'Not authenticated as affiliate.' }, { status: 401 });
    }

    const account = await prisma.affiliateAccount.findUnique({
      where: { id: session.id },
      include: {
        programmes: {
          include: {
            programme: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ success: false, message: 'Affiliate account not found.' }, { status: 404 });
    }

    // Calculate real stats from Orders
    let usersCount = 0;
    let productsSold = 0;
    let totalSalesPaise = 0;

    if (account.couponCode || account.id) {
      const orders = await prisma.order.findMany({
        where: {
          status: 'paid',
          OR: [
            { affiliateId: account.id },
            account.couponCode ? { couponCode: account.couponCode } : { affiliateId: account.id }
          ]
        },
        select: {
          phone: true,
          itemsJson: true,
          total: true
        }
      });

      const uniquePhones = new Set();
      for (const order of orders) {
        if (order.phone) uniquePhones.add(order.phone);
        totalSalesPaise += (order.total || 0);
        try {
          const items = JSON.parse(order.itemsJson || '[]');
          if (Array.isArray(items)) {
            for (const item of items) {
              productsSold += Number(item.qty) || 1;
            }
          }
        } catch {}
      }
      usersCount = uniquePhones.size;
    }

    const programmesList = (account.programmes || []).map(p => ({
      id: p.programme.id,
      title: p.programme.title,
      description: p.programme.description,
      commissionType: p.programme.commissionType || 'percentage',
      commissionValue: p.programme.commissionValue ?? p.programme.commissionPercent ?? 10.0,
      commissionPercent: p.programme.commissionPercent ?? 10.0,
      discountType: p.programme.discountType || 'percentage',
      discountValue: p.programme.discountValue ?? p.programme.discountPercent ?? 5.0,
      discountPercent: p.programme.discountPercent ?? 5.0,
      scopeType: p.programme.scopeType || 'all',
      categoryId: p.programme.categoryId,
      productIds: p.programme.productIds,
      minOrderValue: p.programme.minOrderValue || 0,
      startDate: p.programme.startDate,
      endDate: p.programme.endDate,
      status: p.programme.status,
      terms: p.programme.terms,
      joinedAt: p.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        youtubeUrl: account.youtubeUrl,
        instagramUrl: account.instagramUrl,
        facebookUrl: account.facebookUrl,
        message: account.message,
        status: account.status,
        couponCode: account.couponCode,
        warningMessage: account.warningMessage,
        banMessage: account.banMessage,
        rejectReason: account.rejectReason,
        createdAt: account.createdAt,
        reviewedAt: account.reviewedAt,
        programmes: programmesList,
        stats: {
          usersCount,
          productsSold,
          totalSalesPaise,
        }
      }
    });
  } catch (err) {
    console.error('Affiliate /me error:', err);
    return NextResponse.json({ success: false, message: 'Failed to retrieve affiliate details.' }, { status: 500 });
  }
}
