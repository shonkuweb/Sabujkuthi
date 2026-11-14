import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { hashPassword, isValidPhone, normalizePhone } from '../../../../lib/customer-auth.mjs';
import { createAffiliateSession } from '../../../../lib/affiliate-session.mjs';

function isValidUrl(string) {
  if (!string || typeof string !== 'string') return false;
  const trimmed = string.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

function normalizeUrl(string) {
  if (!string || typeof string !== 'string') return null;
  const trimmed = string.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, youtubeUrl, instagramUrl, facebookUrl, message } = body;
    const rawPhone = body.phone;

    // 1. Validate Name
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ success: false, message: 'Please provide your full name.' }, { status: 400 });
    }

    // 2. Validate Email
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 150) : '';
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ success: false, message: 'Please provide a valid email address.' }, { status: 400 });
    }

    // 3. Validate Phone
    const phone = normalizePhone(rawPhone);
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 });
    }

    // 4. Validate Password
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // 5. Validate at least one profile link
    const cleanYoutube = typeof youtubeUrl === 'string' && youtubeUrl.trim() ? normalizeUrl(youtubeUrl) : null;
    const cleanInsta = typeof instagramUrl === 'string' && instagramUrl.trim() ? normalizeUrl(instagramUrl) : null;
    const cleanFb = typeof facebookUrl === 'string' && facebookUrl.trim() ? normalizeUrl(facebookUrl) : null;

    if (!cleanYoutube && !cleanInsta && !cleanFb) {
      return NextResponse.json({
        success: false,
        message: 'Please provide at least one profile link (YouTube, Instagram, or Facebook).'
      }, { status: 400 });
    }

    if (cleanYoutube && !isValidUrl(cleanYoutube)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid YouTube channel or profile URL.' }, { status: 400 });
    }
    if (cleanInsta && !isValidUrl(cleanInsta)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid Instagram profile URL.' }, { status: 400 });
    }
    if (cleanFb && !isValidUrl(cleanFb)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid Facebook profile or page URL.' }, { status: 400 });
    }

    // 6. Message (optional short message)
    const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 1000) : '';

    // Check if phone already registered in AffiliateAccount
    const existing = await prisma.affiliateAccount.findUnique({
      where: { phone }
    });

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json({
          success: false,
          message: 'An affiliate application with this mobile number is already pending review. Please log in to check your status.'
        }, { status: 409 });
      }
      if (existing.status === 'approved') {
        return NextResponse.json({
          success: false,
          message: 'You already have an active affiliate account with this mobile number. Please log in.'
        }, { status: 409 });
      }
      if (existing.status === 'banned') {
        return NextResponse.json({
          success: false,
          message: 'This mobile number is associated with a suspended affiliate account.'
        }, { status: 403 });
      }
      // If rejected earlier, allow them to re-apply by updating the existing record
      const passwordHash = hashPassword(password);
      const updated = await prisma.affiliateAccount.update({
        where: { id: existing.id },
        data: {
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          youtubeUrl: cleanYoutube,
          instagramUrl: cleanInsta,
          facebookUrl: cleanFb,
          message: cleanMessage || null,
          status: 'pending',
          rejectReason: null,
          warningMessage: null,
          reviewedAt: null,
        }
      });

      const token = await createAffiliateSession(updated);
      const response = NextResponse.json({
        success: true,
        message: 'Your application has been resubmitted for review.',
        account: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          status: updated.status,
        }
      });
      response.cookies.set('affiliate_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
      return response;
    }

    const passwordHash = hashPassword(password);
    const account = await prisma.affiliateAccount.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone,
        passwordHash,
        youtubeUrl: cleanYoutube,
        instagramUrl: cleanInsta,
        facebookUrl: cleanFb,
        message: cleanMessage || null,
        status: 'pending',
      }
    });

    const token = await createAffiliateSession(account);
    const response = NextResponse.json({
      success: true,
      message: 'Application submitted successfully! Our nursery team will review your profile shortly.',
      account: {
        id: account.id,
        name: account.name,
        phone: account.phone,
        status: account.status,
      }
    });

    response.cookies.set('affiliate_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('Error in affiliate apply:', err);
    return NextResponse.json({ success: false, message: 'Unable to process your application. Please try again.' }, { status: 500 });
  }
}
