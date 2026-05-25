import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Load environment variables
const PORT = process.env.PORT || 3000;
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_PROFILE = process.env.AWS_PROFILE;

if (!BUCKET_NAME) {
  console.error("❌ Error: AWS_BUCKET_NAME is not defined in the environment or .env file.");
  process.exit(1);
}

console.log("⚙️  Configuring S3 Client...");
console.log(`   Bucket: ${BUCKET_NAME}`);
console.log(`   Region: ${AWS_REGION}`);

if (process.env.AWS_ACCESS_KEY_ID) {
  console.log("   🔑 Auth Method: AWS Access Keys (from .env / environment)");
} else if (AWS_PROFILE) {
  console.log(`   👤 Auth Method: AWS Profile (Profile: '${AWS_PROFILE}')`);
} else {
  console.log("   🛡️  Auth Method: Default Provider Chain (IAM Role on EC2 / Instance Profile)");
}

// Initialize the S3 Client
const s3Config: any = {
  region: AWS_REGION,
};

// Use AWS profile credentials if specified (local dev option)
if (AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) {
  try {
    s3Config.credentials = fromIni({ profile: AWS_PROFILE });
  } catch (err: any) {
    console.warn(`⚠️  Warning: Failed to load credentials for profile '${AWS_PROFILE}'. Falling back to default.`, err.message);
  }
}

const s3Client = new S3Client(s3Config);

// Helper: Content-Types mapping for static files
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

// Server handler
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`[${req.method}] ${path}`);

    // --- API Endpoints ---

    // GET /api/images - List all images in S3 bucket
    if (path === "/api/images" && req.method === "GET") {
      try {
        const command = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
        });

        const s3Response = await s3Client.send(command);
        const contents = s3Response.Contents || [];

        // Filter for image file extensions
        const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"];
        const imageObjects = contents.filter(item => {
          if (!item.Key) return false;
          const keyLower = item.Key.toLowerCase();
          return imageExtensions.some(ext => keyLower.endsWith(ext));
        });

        // Map objects to construct secure, presigned S3 URLs
        const images = await Promise.all(
          imageObjects.map(async (item) => {
            const key = item.Key!;
            const getCommand = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            });
            // Presigned URL expires in 1 hour (3600 seconds)
            const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
            return {
              key,
              size: item.Size,
              lastModified: item.LastModified,
              url: presignedUrl
            };
          })
        );

        // Sort by last modified date (newest first)
        images.sort((a, b) => {
          const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
          const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
          return dateB - dateA;
        });

        return Response.json({ images });
      } catch (err: any) {
        console.error("❌ S3 ListObjectsV2 Error:", err);
        return Response.json(
          { error: `S3 Error: ${err.message || err}` },
          { status: 500 }
        );
      }
    }

    // POST /api/upload - Upload an image to S3 bucket
    if (path === "/api/upload" && req.method === "POST") {
      try {
        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
          return Response.json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          return Response.json({ error: "Missing 'file' parameter" }, { status: 400 });
        }

        // Validate that file is indeed an image
        if (!file.type.startsWith("image/")) {
          return Response.json({ error: "Uploaded file is not an image" }, { status: 400 });
        }

        // Convert the File into an ArrayBuffer and Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Prepend current timestamp to filename to prevent duplicates
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const s3Key = `uploads/${Date.now()}-${cleanFileName}`;

        console.log(`📤 Uploading "${file.name}" to S3 key "${s3Key}" (${file.size} bytes)...`);

        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: file.type,
          // If you want uploaded files to be public readable:
          // ACL: "public-read"
          // Note: If S3 public access block is turned on, ACL might throw an Access Denied error.
          // Therefore, we rely on the S3 bucket policy (PublicReadGetObject) rather than setting ACL on individual objects.
        });

        await s3Client.send(command);

        // Generate presigned URL for the newly uploaded image
        const getCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        });
        const fileUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
        console.log(`✅ Upload complete! URL: ${fileUrl}`);

        return Response.json({
          success: true,
          key: s3Key,
          url: fileUrl
        });

      } catch (err: any) {
        console.error("❌ S3 Upload Error:", err);
        return Response.json(
          { error: `Upload S3 Error: ${err.message || err}` },
          { status: 500 }
        );
      }
    }

    // DELETE /api/images - Delete an image from S3 bucket
    if (path === "/api/images" && req.method === "DELETE") {
      try {
        const key = url.searchParams.get("key");
        if (!key) {
          return Response.json({ error: "Missing 'key' parameter" }, { status: 400 });
        }

        console.log(`🗑️ Deleting key "${key}" from S3 bucket...`);

        const command = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        });

        await s3Client.send(command);
        console.log(`✅ Key "${key}" successfully deleted.`);

        return Response.json({ success: true });
      } catch (err: any) {
        console.error("❌ S3 Delete Error:", err);
        return Response.json(
          { error: `Delete S3 Error: ${err.message || err}` },
          { status: 500 }
        );
      }
    }

    // --- Static File Routing ---

    // Default route serving index.html
    let filePath = path === "/" ? "/index.html" : path;
    const fullPath = `./public${filePath}`;
    const file = Bun.file(fullPath);

    if (await file.exists()) {
      const ext = filePath.slice(filePath.lastIndexOf("."));
      const contentType = MIME_TYPES[ext] || "text/plain";
      return new Response(file, {
        headers: { "Content-Type": contentType }
      });
    }

    // Fallback 404
    return new Response("Not Found", { status: 404 });
  },
  error(error) {
    console.error("Server Error:", error);
    return new Response("An internal error occurred", { status: 500 });
  }
});

console.log(`🚀 Bun server running at http://localhost:${server.port}`);
