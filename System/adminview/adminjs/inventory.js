const openButton = document.getElementById('openButton');
const container = document.getElementById('addButton');
const closeButton = document.getElementById('closeButton');


openButton.addEventListener("click", () => {
  container.classList.add("open");
});


closeButton.addEventListener("click", () => {
  container.classList.remove("open");
});

window.addEventListener("click", (event) => {
  if (event.target === container) {
    container.classList.remove("open");
  }
});