// Function to highlight links that might be suspicious
function highlightSuspiciousLinks() {
  const links = document.querySelectorAll("a");

  links.forEach((link) => {
    const url = link.href;

    // Simple rule: Flag links containing suspicious domains (replace with actual logic)
    if (url.includes("free-gift") || url.includes("click-here")) {
      link.style.border = "2px solid red";
      link.style.backgroundColor = "yellow";
      link.title = "This link might be unsafe. Proceed with caution.";
    }
  });
}

// Run the function when the page loads
window.onload = highlightSuspiciousLinks();
