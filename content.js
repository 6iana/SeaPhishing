// function to highlight links that might be suspicious
function highlightSuspiciousLinks() {
  const links = document.querySelectorAll("a");

  links.forEach((link) => {
    const url = link.href;

    // flag links containing suspicious domains
    if (url.includes("free-gift") || url.includes("click-here")) {
      link.style.border = "2px solid red";
      link.style.backgroundColor = "yellow";
      link.title = "This link might be unsafe. Proceed with caution.";
    }
  });
}

// runs the function when the page loads
window.onload = highlightSuspiciousLinks();
