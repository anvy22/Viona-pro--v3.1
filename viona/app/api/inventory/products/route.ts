// app/api/inventory/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getUserRole, hasPermission } from '@/lib/auth';

export type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string;
  stock: number;
  price: number;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  warehouseId?: string; 
};

/**
 * Fetches products from database with optimized query
 * Note: This is NOT cached to ensure instant updates
 */
async function getProducts(orgId: string): Promise<Product[]> {
  const bigOrgId = BigInt(orgId);
  
  // Optimized single query with parallel aggregations
  const products = await prisma.product.findMany({
    where: { 
      org_id: bigOrgId, 
      status: { not: 'deleted' } 
    },
    select: {
      product_id: true,
      name: true,
      sku: true,
      description: true,
      image_url: true,
      created_at: true,
      updated_at: true,
      productStocks: {
        select: { quantity: true },
      },
      productPrices: {
        where: { valid_to: null },
        select: { retail_price: true },
        orderBy: { valid_from: 'desc' },
        take: 1,
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return products.map((p) => ({
    id: p.product_id.toString(),
    name: p.name || '',
    sku: p.sku || '',
    description: p.description || '',
    stock: p.productStocks.reduce((acc, s) => acc + (s.quantity || 0), 0),
    price: p.productPrices[0]?.retail_price?.toNumber() || 0,
    image: p.image_url,
    createdAt: p.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: p.updated_at?.toISOString() || new Date().toISOString(),
  }));
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Get organization ID from query params
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Check permissions (NOT cached - always fresh check)
    const role = await getUserRole(orgId);
    
    if (!hasPermission(role, ['reader', 'writer', 'read-write', 'admin'])) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions to view products',
          role 
        },
        { 
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Fetch products (NOT cached - always fresh data)
    const products = await getProducts(orgId);

    // Return with aggressive no-cache headers for instant updates
    return NextResponse.json(products, {
      status: 200,
      headers: {
        // Prevent ALL caching for instant updates
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        // Metadata
        'X-Products-Count': products.length.toString(),
        'X-Organization-Id': orgId,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isPermissionError = errorMessage.toLowerCase().includes('permission') || 
                              errorMessage.toLowerCase().includes('unauthorized');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { 
        status: isPermissionError ? 403 : 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

// CRITICAL: Force dynamic rendering - never static
export const dynamic = 'force-dynamic';

// CRITICAL: Disable all caching at the route level
export const revalidate = 0;

// Ensure route is not cached by Vercel/CDN
export const fetchCache = 'force-no-store';
