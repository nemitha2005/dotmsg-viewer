const express = require("express");
const multer = require("multer");
const EmlParser = require("eml-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3001;

const upload = multer({
  dest: "./uploads/",
  fileFilter: (req, file, cb) => {
    cb(
      null,
      file.originalname.endsWith(".msg") || file.originalname.endsWith(".json")
    );
  },
});

// Creating uploads folder
if (!fs.existsSync("./uploads")) fs.mkdirSync("./uploads");

app.use(express.static("public"));

// view list of uploaded files
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
  req.files.forEach((file) => {
    if (file.originalname.endsWith(".json")) {
      // Handle base64 data
      try {
        const jsonData = JSON.parse(fs.readFileSync(file.path, "utf8"));

        if (jsonData.FileName && jsonData.FileData) {
          // base64 -> Binary -> .msg file
          const msgBuffer = Buffer.from(jsonData.FileData, "base64");
          const msgPath = path.join("./uploads", jsonData.FileName);
          fs.writeFileSync(msgPath, msgBuffer);
        }

        // Remove the base64 file
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error("Error processing JSON:", error);
      }
    } else {
      // Normal .msg file
      const newPath = path.join("./uploads", file.originalname);
      fs.renameSync(file.path, newPath);
    }
  });

  res.json({ message: "Files uploaded successfully" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
