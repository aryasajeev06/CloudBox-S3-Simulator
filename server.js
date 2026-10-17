const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const app = express();

app.use(cors());

// Store uploaded files temporarily in memory
const upload = multer({
    storage: multer.memoryStorage()
});


// AWS S3 configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1"
});

const BUCKET_NAME = process.env.cloudbox-road-safety-2026-xyz;


// Upload file to S3
app.post("/upload", upload.single("file"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: req.file.originalname,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3.send(command);

        res.json({
            message: "File uploaded successfully",
            fileName: req.file.originalname
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Upload failed",
            error: error.message
        });

    }
});


// Test route
app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// List files from S3
app.get("/files", async (req, res) => {

    try {

        const { ListObjectsV2Command } = require("@aws-sdk/client-s3");

        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME
        });

        const data = await s3.send(command);

        const files = (data.Contents || []).map(function (item) {

            return {
                name: item.Key,
                size: item.Size,
                lastModified: item.LastModified
            };

        });

        res.json(files);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Could not retrieve files",
            error: error.message
        });

    }
});

// Download file from S3
app.get("/download/:fileName", async (req, res) => {

    try {

        const fileName = req.params.fileName;

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName
        });

        const data = await s3.send(command);

        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );

        res.setHeader(
            "Content-Type",
            data.ContentType || "application/octet-stream"
        );

        data.Body.pipe(res);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Download failed",
            error: error.message
        });

    }
});

// Delete file from S3
app.delete("/files/:fileName", async (req, res) => {

    try {

        const fileName = req.params.fileName;

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName
        });

        await s3.send(command);

        res.json({
            message: "File deleted successfully"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Delete failed",
            error: error.message
        });

    }
});


// Start server

// General error handler
app.use((error, req, res, next) => {

    console.error(error);

    if (error.code === "LIMIT_FILE_SIZE") {

        return res.status(400).json({
            message: "File is too large. Maximum size is 10 MB."
        });
    }

    res.status(500).json({
        message: "Something went wrong on the server."
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`CloudBox server running on http://localhost:${PORT}`);
});