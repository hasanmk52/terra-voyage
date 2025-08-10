import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Rate limiting map (in production, use Redis)
const uploadAttempts = new Map<string, { count: number; timestamp: number }>();
const MAX_UPLOADS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userAttempts = uploadAttempts.get(userId);
  
  if (!userAttempts) {
    uploadAttempts.set(userId, { count: 1, timestamp: now });
    return false;
  }
  
  // Reset count if window has passed
  if (now - userAttempts.timestamp > RATE_LIMIT_WINDOW) {
    uploadAttempts.set(userId, { count: 1, timestamp: now });
    return false;
  }
  
  // Check if limit exceeded
  if (userAttempts.count >= MAX_UPLOADS_PER_HOUR) {
    return true;
  }
  
  // Increment count
  userAttempts.count++;
  return false;
}

// Security function to validate image file signatures
function validateImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  
  const signature = buffer.subarray(0, 4);
  
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return signature[0] === 0xFF && signature[1] === 0xD8 && signature[2] === 0xFF;
    case 'image/png':
      return signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4E && signature[3] === 0x47;
    case 'image/webp':
      // WebP files start with "RIFF" and have "WEBP" at offset 8
      return signature.toString('ascii', 0, 4) === 'RIFF' && buffer.length > 11 && buffer.toString('ascii', 8, 12) === 'WEBP';
    default:
      return false;
  }
}

// POST - Upload profile picture
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting check
    if (isRateLimited(session.user.id)) {
      return NextResponse.json(
        { success: false, error: "Too many upload attempts. Please try again later." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('profilePicture') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Enhanced security validation for file uploads
    
    // Validate file type - strict whitelist of allowed MIME types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPEG, PNG, and WebP images are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for security)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size must be less than 2MB" },
        { status: 400 }
      );
    }

    // Validate file name to prevent directory traversal
    if (file.name.includes('../') || file.name.includes('..\\') || file.name.includes('/') || file.name.includes('\\')) {
      return NextResponse.json(
        { success: false, error: "Invalid file name" },
        { status: 400 }
      );
    }

    // Additional security: Validate actual file content matches MIME type
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Check file signatures (magic numbers) for security
    const isValidImage = validateImageSignature(buffer, file.type);
    if (!isValidImage) {
      return NextResponse.json(
        { success: false, error: "Invalid image file - content doesn't match type" },
        { status: 400 }
      );
    }

    // Buffer already created above for security validation - reuse it

    // Update user's profile picture in database
    await db.user.update({
      where: { id: session.user.id },
      data: {
        profilePicture: buffer,
        profilePictureType: file.type,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile picture updated successfully"
    });

  } catch (error) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get profile picture
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        profilePicture: true,
        profilePictureType: true,
      }
    });

    if (!user || !user.profilePicture || !user.profilePictureType) {
      return NextResponse.json(
        { success: false, error: "Profile picture not found" },
        { status: 404 }
      );
    }

    // Return the image as a response with secure headers
    return new NextResponse(user.profilePicture, {
      headers: {
        'Content-Type': user.profilePictureType,
        'Cache-Control': 'private, max-age=3600', // Private cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
        'Content-Disposition': 'inline; filename="profile-picture"',
      },
    });

  } catch (error) {
    console.error("Profile picture fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove profile picture
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        profilePicture: null,
        profilePictureType: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile picture removed successfully"
    });

  } catch (error) {
    console.error("Profile picture deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}