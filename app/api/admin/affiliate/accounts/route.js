import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../lib/admin-session.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const accounts = await prisma.affiliateAccount.findMany({
      where: {
        status: { in: ['approved', 'banned'] }
      },
      orderBy: { reviewedAt: 'desc' },
      include: {
        programmes: {
          include: {
            programme: true
          }
        }
      }
    });

    // Fetch all paid orders to compute metrics per affiliate
    const paidOrders = await prisma.order.findMany({
      where: { status: 'paid' },
      select: {
        id: true,
        phone: true,
        couponCode: true,
        affiliateId: true,
        itemsJson: true,
        total: true,
      }
    });

    const accountsWithMetrics = accounts.map(acc => {
      // Find orders matching this account by couponCode or affiliateId
      const matchingOrders = paidOrders.filter(order =>
        order.affiliateId === acc.id ||
        (acc.couponCode && order.couponCode && order.couponCode.toUpperCase() === acc.couponCode.toUpperCase())
      );

      const uniqueUsers = new Set();
      let productsSold = 0;
      let totalSalesPaise = 0;

      for (const order of matchingOrders) {
        if (order.phone) uniqueUsers.add(order.phone);
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

      const assignedProgrammes = (acc.programmes || []).map(p => ({
        id: p.programme.id,
        title: p.programme.title,
        commissionPercent: p.programme.commissionPercent,
        discountPercent: p.programme.discountPercent,
        status: p.programme.status,
      }));

      return {
        id: acc.id,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        youtubeUrl: acc.youtubeUrl,
        instagramUrl: acc.instagramUrl,
        facebookUrl: acc.facebookUrl,
        message: acc.message,
        status: acc.status,
        couponCode: acc.couponCode,
        warningMessage: acc.warningMessage,
        banMessage: acc.banMessage,
        createdAt: acc.createdAt,
        reviewedAt: acc.reviewedAt,
        programmes: assignedProgrammes,
        programmesCount: assignedProgrammes.length,
        usersCount: uniqueUsers.size,
        ordersCount: matchingOrders.length,
        productsSold,
        totalSalesPaise,
      };
    });

    return NextResponse.json({ success: true, accounts: accountsWithMetrics });
  } catch (error) {
    console.error('Error fetching affiliate accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate accounts.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
    }

    const account = await prisma.affiliateAccount.findUnique({
      where: { id }
    });

    if (!account) {
      return NextResponse.json({ error: 'Affiliate account not found.' }, { status: 404 });
    }

    // 1. Give / update warning notification
    if (action === 'warning') {
      const warningMessage = typeof body.warningMessage === 'string' ? body.warningMessage.trim().slice(0, 500) : null;

      const updated = await prisma.affiliateAccount.update({
        where: { id },
        data: {
          warningMessage: warningMessage || null,
        }
      });

      return NextResponse.json({
        success: true,
        message: warningMessage
          ? `Warning notification sent to ${updated.name}'s creator dashboard.`
          : `Warning cleared for ${updated.name}.`,
        account: updated
      });
    }

    // 2. Ban account
    if (action === 'ban') {
      const banMessage = typeof body.banMessage === 'string' ? body.banMessage.trim().slice(0, 500) : '';

      if (!banMessage) {
        return NextResponse.json({ error: 'Please provide a ban message explaining the reason to the creator.' }, { status: 400 });
      }

      const updated = await prisma.affiliateAccount.update({
        where: { id },
        data: {
          status: 'banned',
          banMessage,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Account for ${updated.name} has been banned. The message will be shown on their dashboard.`,
        account: updated
      });
    }

    // 3. Unban account
    if (action === 'unban') {
      const updated = await prisma.affiliateAccount.update({
        where: { id },
        data: {
          status: 'approved',
          banMessage: null,
        }
      });

      return NextResponse.json({
        success: true,
        message: `Account for ${updated.name} has been restored to Active status.`,
        account: updated
      });
    }

    // 4. Update coupon code or programmes
    if (action === 'update') {
      const rawCoupon = body.couponCode;
      let cleanCoupon = typeof rawCoupon === 'string' ? rawCoupon.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : account.couponCode;

      if (cleanCoupon && cleanCoupon !== account.couponCode) {
        const existingWithCode = await prisma.affiliateAccount.findFirst({
          where: {
            couponCode: cleanCoupon,
            NOT: { id }
          }
        });
        if (existingWithCode) {
          return NextResponse.json({ error: `Coupon code "${cleanCoupon}" is already in use.` }, { status: 409 });
        }
      }

      const programmeIds = Array.isArray(body.programmeIds) ? body.programmeIds : null;

      const updated = await prisma.$transaction(async (tx) => {
        if (programmeIds !== null) {
          await tx.affiliateAccountProgramme.deleteMany({
            where: { affiliateId: id }
          });
          for (const progId of programmeIds) {
            await tx.affiliateAccountProgramme.create({
              data: {
                affiliateId: id,
                programmeId: progId
              }
            });
          }
        }

        return tx.affiliateAccount.update({
          where: { id },
          data: {
            couponCode: cleanCoupon
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: `Account details updated for ${updated.name}.`,
        account: updated
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error handling affiliate account action:', error);
    return NextResponse.json({ error: 'Failed to update affiliate account.' }, { status: 500 });
  }
}
