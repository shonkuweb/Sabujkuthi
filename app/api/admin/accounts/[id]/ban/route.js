import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../../lib/admin-session.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Please sign in as admin.' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Customer ID is required.' }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, phone: true, name: true, isBanned: true, banReason: true, bannedAt: true }
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer account not found.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, note } = body;

    // Handle Unban
    if (action === 'unban') {
      if (!customer.isBanned) {
        return NextResponse.json({ success: false, error: 'Account is not banned.' }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          isBanned: false,
          banReason: null,
          bannedAt: null,
        },
        select: { id: true, phone: true, name: true, isBanned: true, banReason: true, bannedAt: true }
      });

      return NextResponse.json({
        success: true,
        message: 'Account has been unbanned successfully.',
        customer: updated,
      });
    }

    // IMMUTABILITY RULE:
    // "the note is not editable from the admin panel after banning an account"
    if (customer.isBanned) {
      return NextResponse.json({
        success: false,
        error: 'The ban note is permanent and cannot be edited after an account has been banned.',
      }, { status: 400 });
    }

    // Validate Note
    const cleanNote = typeof note === 'string' ? note.trim() : '';
    if (!cleanNote) {
      return NextResponse.json({
        success: false,
        error: 'A proper note explaining the reason for banning is required.',
      }, { status: 400 });
    }

    if (cleanNote.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a descriptive note explaining why this account is being banned.',
      }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        isBanned: true,
        banReason: cleanNote,
        bannedAt: new Date(),
      },
      select: { id: true, phone: true, name: true, isBanned: true, banReason: true, bannedAt: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Account banned successfully. The ban note is permanently recorded.',
      customer: updated,
    });
  } catch (error) {
    console.error('Ban customer error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update account ban status.' }, { status: 500 });
  }
}
