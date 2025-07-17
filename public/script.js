async function loadFiles() {
  const response = await fetch("/api/files");
  const files = await response.json();

  document.getElementById("fileList").innerHTML =
    files.length === 0
      ? "<p>No files uploaded</p>"
      : files
          .map(
            (file) =>
              `<div class="file-item" onclick="viewEmail('${file.name}')">${file.name}</div>`
          )
          .join("");
}

// Upload files
document.getElementById("fileInput").addEventListener("change", async (e) => {
  const formData = new FormData();
  for (let file of e.target.files) {
    formData.append("msgFiles", file);
  }

  await fetch("/api/upload", { method: "POST", body: formData });
  loadFiles();
});

// View email
async function viewEmail(filename) {
  document.querySelectorAll(".file-item").forEach((item) => {
    item.classList.toggle("active", item.textContent === filename);
  });

  const response = await fetch(`/api/email/${encodeURIComponent(filename)}`);
  const email = await response.json();

  document.getElementById("emailViewer").innerHTML = `
                <h2>${email.subject}</h2>
                <p><strong>From:</strong> ${email.sender} &lt;${
    email.senderEmail
  }&gt;</p>
                <p><strong>To:</strong> ${email.recipients.join(", ")}</p>
                <p><strong>Date:</strong> ${new Date(
                  email.date
                ).toLocaleString()}</p>
                <div class="email-body">${email.bodyHtml || email.body}</div>
            `;
}

// Load files on start
loadFiles();
