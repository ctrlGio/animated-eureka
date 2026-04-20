const openButton = document.getElementById('openBorrow');
const container = document.getElementById('newBorrowModal');
const closeButton = document.getElementById('closeNewBorrowModal');


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
