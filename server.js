const express = require("express");
const multer = require("multer");
const EmlParser = require("eml-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3001;

// Simple file upload to uploads folder
const upload = multer({
  dest: "./uploads/",
  fileFilter: (req, file, cb) => {
    cb(null, file.originalname.endsWith(".msg"));
  },
});

// Create uploads folder
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");

// Serve static files
app.use(express.static("public"));

// Get list of .msg files
app.get("/api/files", (req, res) => {
  const files = fs
    .readdirSync("./uploads")
    .filter((file) => file.endsWith(".msg"))
    .map((file) => ({ name: file }));
  res.json(files);
});

// Parse .msg file
app.get("/api/email/:filename", async (req, res) => {
  try {
    const filePath = path.join("./uploads", req.params.filename);
    const fileStream = fs.createReadStream(filePath);
    const msgData = await new EmlParser(fileStream).parseMsg();

    const recipients =
      msgData.recipients?.map((r) => r.smtpAddress || r.name) || [];

    res.json({
      filename: req.params.filename,
      subject: msgData.subject || "No Subject",
      sender: msgData.senderName || "Unknown",
      senderEmail: msgData.senderSmtpAddress || "",
      recipients: recipients,
      bodyHtml: msgData.html || "",
      body: msgData.body || "",
      date: msgData.creationTime || new Date(),
      attachments: msgData.attachments || [],
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to parse .msg file" });
  }
});

// Upload files
app.post("/api/upload", upload.array("msgFiles"), (req, res) => {
  // Rename uploaded files to original names
  req.files.forEach((file) => {
    const newPath = path.join("./uploads", file.originalname);
    fs.renameSync(file.path, newPath);
  });

  res.json({ message: "Files uploaded successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
