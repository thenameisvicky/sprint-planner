/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleProxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleProxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleProxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return handleProxy(request, path);
}

async function handleProxy(request: NextRequest, pathParts: string[]) {
  // Read target PostgREST API URL from server-side environment variable at RUNTIME
  const targetBase = process.env.POSTGREST_URL || 'http://127.0.0.1:8000';
  const path = pathParts.join('/');
  
  // Extract query parameters
  const { search } = new URL(request.url);
  const targetUrl = `${targetBase}/${path}${search}`;

  // Get body if any
  let body: any = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text();
    } catch (_) {}
  }

  // Enhanced Request Logging
  console.log(`[API PROXY] ---> ${request.method} /api/${path}${search}`);
  if (body) {
    console.log(`[API PROXY] Payload: ${body}`);
  }

  // Get headers from request and forward them
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host header to avoid SSL/routing mismatches
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // Avoid Next.js caching API requests in production
      cache: 'no-store',
    });

    const resBody = (res.status === 204 || res.status === 304) ? null : await res.text();
    
    // Enhanced Response Logging
    console.log(`[API PROXY] <--- ${res.status} ${res.statusText} from ${targetUrl}`);
    if (resBody && !res.ok) {
      console.log(`[API PROXY] Error Response Body: ${resBody}`);
    }

    // Create response with same status and headers
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(resBody, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[API PROXY] Error calling ${targetUrl}:`, error);
    return NextResponse.json({ error: 'Failed to connect to backend service' }, { status: 502 });
  }
}
