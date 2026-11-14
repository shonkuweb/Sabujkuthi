import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { isAdminRequest } from '../../../../../lib/admin-session.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const [programmes, categories, products, approvedPartners] = await Promise.all([
      prisma.affiliateProgramme.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          accounts: {
            include: {
              affiliate: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  couponCode: true,
                  status: true,
                }
              }
            }
          }
        }
      }),
      prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }),
      prisma.product.findMany({
        where: { isPublished: true },
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          categoryId: true,
        }
      }),
      prisma.affiliateAccount.findMany({
        where: { status: 'approved' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          couponCode: true,
        }
      })
    ]);

    const formattedProgrammes = programmes.map(prog => {
      let parsedProductIds = [];
      if (prog.productIds) {
        try {
          parsedProductIds = JSON.parse(prog.productIds);
        } catch {}
      }

      const enrolledPartners = (prog.accounts || []).map(a => a.affiliate).filter(Boolean);

      return {
        id: prog.id,
        title: prog.title,
        description: prog.description,
        commissionType: prog.commissionType || 'percentage',
        commissionValue: prog.commissionValue ?? prog.commissionPercent ?? 10.0,
        commissionPercent: prog.commissionPercent ?? 10.0,
        discountType: prog.discountType || 'percentage',
        discountValue: prog.discountValue ?? prog.discountPercent ?? 5.0,
        discountPercent: prog.discountPercent ?? 5.0,
        scopeType: prog.scopeType || 'all',
        categoryId: prog.categoryId,
        productIds: parsedProductIds,
        minOrderValue: prog.minOrderValue || 0,
        startDate: prog.startDate,
        endDate: prog.endDate,
        status: prog.status,
        terms: prog.terms,
        createdAt: prog.createdAt,
        enrolledCount: enrolledPartners.length,
        enrolledPartners,
        partnerIds: enrolledPartners.map(p => p.id),
      };
    });

    return NextResponse.json({
      success: true,
      programmes: formattedProgrammes,
      categories,
      products,
      approvedPartners,
    });
  } catch (error) {
    console.error('Error fetching affiliate programmes:', error);
    return NextResponse.json({ error: 'Failed to fetch affiliate programmes.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      commissionType = 'percentage',
      commissionValue,
      discountType = 'percentage',
      discountValue,
      scopeType = 'all',
      categoryId,
      productIds,
      minOrderValue = 0,
      startDate,
      endDate,
      terms,
      status = 'active',
      partnerIds = [],
    } = body;

    const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 150) : '';
    if (!cleanTitle) {
      return NextResponse.json({ error: 'Programme title is required.' }, { status: 400 });
    }

    const commVal = Math.max(0, Number(commissionValue) || 0);
    const discVal = Math.max(0, Number(discountValue) || 0);
    const commPercent = commissionType === 'percentage' ? commVal : 10.0;
    const discPercent = discountType === 'percentage' ? discVal : 5.0;

    let cleanProductIdsJson = null;
    if (scopeType === 'products' && Array.isArray(productIds)) {
      cleanProductIdsJson = JSON.stringify(productIds);
    }

    const programme = await prisma.$transaction(async (tx) => {
      const created = await tx.affiliateProgramme.create({
        data: {
          title: cleanTitle,
          description: typeof description === 'string' ? description.trim() : null,
          commissionType: commissionType === 'fixed' ? 'fixed' : 'percentage',
          commissionValue: commVal,
          commissionPercent: commPercent,
          discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
          discountValue: discVal,
          discountPercent: discPercent,
          scopeType: ['category', 'products'].includes(scopeType) ? scopeType : 'all',
          categoryId: scopeType === 'category' && categoryId ? categoryId : null,
          productIds: cleanProductIdsJson,
          minOrderValue: Math.max(0, parseInt(minOrderValue, 10) || 0),
          startDate: typeof startDate === 'string' && startDate.trim() ? startDate.trim() : null,
          endDate: typeof endDate === 'string' && endDate.trim() ? endDate.trim() : null,
          terms: typeof terms === 'string' ? terms.trim() : null,
          status: status === 'inactive' ? 'inactive' : 'active',
        }
      });

      // Link selected approved partners
      if (Array.isArray(partnerIds) && partnerIds.length > 0) {
        for (const partnerId of partnerIds) {
          await tx.affiliateAccountProgramme.create({
            data: {
              affiliateId: partnerId,
              programmeId: created.id
            }
          });
        }
      }

      return created;
    });

    return NextResponse.json({
      success: true,
      message: 'Affiliate programme created successfully.',
      programme
    });
  } catch (error) {
    console.error('Error creating affiliate programme:', error);
    return NextResponse.json({ error: 'Failed to create affiliate programme.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      commissionType,
      commissionValue,
      discountType,
      discountValue,
      scopeType,
      categoryId,
      productIds,
      minOrderValue,
      startDate,
      endDate,
      terms,
      status,
      partnerIds,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Programme ID is required.' }, { status: 400 });
    }

    const data = {};
    if (typeof title === 'string' && title.trim()) data.title = title.trim();
    if (description !== undefined) data.description = typeof description === 'string' ? description.trim() : null;

    if (commissionType !== undefined) {
      data.commissionType = commissionType === 'fixed' ? 'fixed' : 'percentage';
    }
    if (commissionValue !== undefined) {
      const val = Math.max(0, Number(commissionValue) || 0);
      data.commissionValue = val;
      if (commissionType === 'percentage' || (!commissionType && val <= 100)) {
        data.commissionPercent = val;
      }
    }

    if (discountType !== undefined) {
      data.discountType = discountType === 'fixed' ? 'fixed' : 'percentage';
    }
    if (discountValue !== undefined) {
      const val = Math.max(0, Number(discountValue) || 0);
      data.discountValue = val;
      if (discountType === 'percentage' || (!discountType && val <= 100)) {
        data.discountPercent = val;
      }
    }

    if (scopeType !== undefined) {
      data.scopeType = ['category', 'products'].includes(scopeType) ? scopeType : 'all';
      data.categoryId = scopeType === 'category' && categoryId ? categoryId : null;
      data.productIds = scopeType === 'products' && Array.isArray(productIds) ? JSON.stringify(productIds) : null;
    }

    if (minOrderValue !== undefined) {
      data.minOrderValue = Math.max(0, parseInt(minOrderValue, 10) || 0);
    }
    if (startDate !== undefined) {
      data.startDate = typeof startDate === 'string' && startDate.trim() ? startDate.trim() : null;
    }
    if (endDate !== undefined) {
      data.endDate = typeof endDate === 'string' && endDate.trim() ? endDate.trim() : null;
    }
    if (terms !== undefined) {
      data.terms = typeof terms === 'string' ? terms.trim() : null;
    }
    if (status !== undefined) {
      data.status = status === 'inactive' ? 'inactive' : 'active';
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prog = await tx.affiliateProgramme.update({
        where: { id },
        data
      });

      if (Array.isArray(partnerIds)) {
        // Re-assign partners
        await tx.affiliateAccountProgramme.deleteMany({
          where: { programmeId: id }
        });
        for (const partnerId of partnerIds) {
          await tx.affiliateAccountProgramme.create({
            data: {
              affiliateId: partnerId,
              programmeId: id
            }
          });
        }
      }

      return prog;
    });

    return NextResponse.json({
      success: true,
      message: 'Programme updated successfully.',
      programme: updated
    });
  } catch (error) {
    console.error('Error updating affiliate programme:', error);
    return NextResponse.json({ error: 'Failed to update affiliate programme.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Programme ID is required.' }, { status: 400 });
    }

    await prisma.affiliateProgramme.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Programme removed successfully.' });
  } catch (error) {
    console.error('Error deleting affiliate programme:', error);
    return NextResponse.json({ error: 'Failed to delete affiliate programme.' }, { status: 500 });
  }
}
