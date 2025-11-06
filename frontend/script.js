document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const imageFile = document.getElementById("imageInput").files[0];
  const query = document.getElementById("queryInput").value;
  const resultContainer = document.getElementById("resultContainer");
  const resultText = document.getElementById("resultText");

  if (!imageFile || !query) return alert("Please provide both image and query.");

  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("query", query);

  resultText.textContent = "Analyzing your crop... Please wait 🌿";
  resultContainer.classList.remove("hidden");

  try {
    const response = await fetch("http://127.0.0.1:5000/analyze_crop", {
      method: "POST",
      body: formData
    });

    // Check HTTP-level success
    if (!response.ok) {
      const errorText = await response.text().catch(() => null);
      console.error("Server returned non-OK status:", response.status, errorText);
      resultText.textContent = `Server error: ${response.status}`;
      return;
    }

    const data = await response.json();

    // Handle application-level response
    if (data.status === "success" && data.result) {
      // Sanitize model output: remove/normalize long runs of asterisks
      // (some models include `***` or `**` as separators/markdown)
      let clean = data.result;
      try {
        // Replace 3+ asterisks with a single newline (visual separator)
        clean = clean.replace(/\*{3,}/g, "\n");
        // Remove double-asterisk bold markers
        clean = clean.replace(/\*{2}/g, "");
        // Collapse repeated newlines
        clean = clean.replace(/\n{3,}/g, "\n\n");
        // Trim leading/trailing whitespace
        clean = clean.trim();
      } catch (e) {
        console.warn("Sanitizer failed:", e);
        clean = data.result;
      }

      console.debug("Raw model output:", data.result);

      // Detect if content looks like Markdown (headers, code fences, lists, or bold/italics)
      const looksLikeMarkdown = /(^#{1,6}\s)|(^```)|(^>\s)|(^[-*+]\s)|\*\*|\*\w|`/.test(clean);

      if (looksLikeMarkdown && window.marked && window.DOMPurify) {
        try {
          const html = marked.parse(clean);
          // Sanitize HTML to prevent XSS
          const safe = DOMPurify.sanitize(html);
          resultText.innerHTML = safe;
        } catch (e) {
          console.warn("Markdown rendering failed, falling back to text:", e);
          resultText.textContent = clean;
        }
      } else {
        // Plain text
        resultText.textContent = clean;
      }
    } else if (data.error) {
      resultText.textContent = `Error: ${data.error}`;
    } else {
      resultText.textContent = "Something went wrong. Please try again.";
    }
  } catch (err) {
    console.error("Fetch error:", err);
    resultText.textContent = "Error connecting to server. Check backend and CORS settings.";
  }
});
