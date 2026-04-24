const openBtn = document.getElementById("openBorrow");
const modal = document.getElementById("newBorrowModal");
const closeBtn = document.getElementById("closeNewBorrowModal");


openBtn.addEventListener("click", () => {
  openBtn.onclick = () => modal.style.display = "flex";
});


closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

openButton.addEventListener("click", () => {
  container.classList.add("open");
});

console.log(openBtn, modal);