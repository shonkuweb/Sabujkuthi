import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get('code');
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';

    if (!code) {
      return NextResponse.json({ valid: false, message: 'Please enter a coupon code.' }, { status: 400 });
    }

    const account = await prisma.affiliateAccount.findFirst({
      where: {
        couponCode: code,
        status: 'approved'
      },
      include: {
        programmes: {
          include: {
            programme: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid or expired coupon code. Please verify the code.'
      }, { status: 404 });
    }

    // Find highest customer discount among active assigned programmes, fallback to 5%
    let discountPercent = 5.0;
    const activeProgrammes = (account.programmes || [])
      .map(p => p.programme)
      .filter(p => p && p.status === 'active');

    if (activeProgrammes.length > 0) {
      discountPercent = Math.max(...activeProgrammes.map(p => p.discountPercent || 5.0));
    }

    return NextResponse.json({
      valid: true,
      couponCode: account.couponCode,
      affiliateId: account.id,
      affiliateName: account.name,
      discountPercent,
      message: `Coupon applied! ${discountPercent}% discount from partner ${account.name}.`
    });
  } catch (error) {
    console.error('Error validating affiliate coupon:', error);
    return NextResponse.json({ valid: false, message: 'Could not validate coupon.' }, { status: 500 });
  }
}
