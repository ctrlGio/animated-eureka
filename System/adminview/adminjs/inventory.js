const openButton = document.getElementById('openButton');
const addButtonModal = document.getElementById('addButton');
const closeButton = document.getElementById('closeButton');

openButton.addEventListener("click", () => {
  addButton.classList.add("open");
});

closeButton.addEventListener("click", () => {
  addButton.classList.remove("open");
});
