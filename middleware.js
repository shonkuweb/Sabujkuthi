import { NextResponse } from 'next/server';
import { verifyAdminSession } from './lib/admin-session.mjs';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Exclude login page from protection
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }
  
  // Protect all other /admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token');
    
    if (!await verifyAdminSession(token?.value)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
