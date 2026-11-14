import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../lib/admin-session.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const where = {};
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    const requests = await prisma.affiliateAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        youtubeUrl: true,
        instagramUrl: true,
        facebookUrl: true,
        message: true,
        status: true,
        couponCode: true,
        rejectReason: true,
        createdAt: true,
        reviewedAt: true,
        programmes: {
          select: {
            programme: {
              select: {
                id: true,
                title: true,
                commissionPercent: true,
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching affiliate requests:', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate requests.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Affiliate ID is required.' }, { status: 400 });
    }

    const targetAccount = await prisma.affiliateAccount.findUnique({
      where: { id }
    });

    if (!targetAccount) {
      return NextResponse.json({ error: 'Affiliate account not found.' }, { status: 404 });
    }

    if (action === 'approve') {
      const rawCoupon = body.couponCode;
      let cleanCoupon = typeof rawCoupon === 'string' ? rawCoupon.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';

      if (!cleanCoupon) {
        // Auto-generate code from name
        const prefix = targetAccount.name.replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase() || 'SK';
        cleanCoupon = `${prefix}10`;
      }

      // Check coupon code uniqueness with other accounts
      const existingWithCode = await prisma.affiliateAccount.findFirst({
        where: {
          couponCode: cleanCoupon,
          NOT: { id }
        }
      });

      if (existingWithCode) {
        return NextResponse.json({
          error: `Coupon code "${cleanCoupon}" is already assigned to another partner. Please choose another code.`
        }, { status: 409 });
      }

      // Handle assigned programmes
      const programmeIds = Array.isArray(body.programmeIds) ? body.programmeIds : [];

      const updated = await prisma.$transaction(async (tx) => {
        // Remove existing programme links if any
        await tx.affiliateAccountProgramme.deleteMany({
          where: { affiliateId: id }
        });

        // Add selected programmes
        if (programmeIds.length > 0) {
          for (const progId of programmeIds) {
            await tx.affiliateAccountProgramme.create({
              data: {
                affiliateId: id,
                programmeId: progId
              }
            });
          }
        } else {
          // If none provided, connect first active programme as default
          const defaultProg = await tx.affiliateProgramme.findFirst({
            where: { status: 'active' },
            orderBy: { createdAt: 'asc' }
          });
          if (defaultProg) {
            await tx.affiliateAccountProgramme.create({
              data: {
                affiliateId: id,
                programmeId: defaultProg.id
              }
            });
          }
        }

        return tx.affiliateAccount.update({
          where: { id },
          data: {
            status: 'approved',
            couponCode: cleanCoupon,
            rejectReason: null,
            reviewedAt: new Date(),
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: `Partner application for ${updated.name} approved with coupon code ${cleanCoupon}.`,
        account: updated
      });
    }

    if (action === 'reject') {
      const rejectReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : null;

      const updated = await prisma.affiliateAccount.update({
        where: { id },
        data: {
          status: 'rejected',
          rejectReason: rejectReason || 'Application criteria not met at this time.',
          reviewedAt: new Date(),
        }
      });

      return NextResponse.json({
        success: true,
        message: `Application for ${updated.name} has been rejected.`,
        account: updated
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating affiliate request:', error);
    return NextResponse.json({ error: 'Failed to process request action.' }, { status: 500 });
  }
}
