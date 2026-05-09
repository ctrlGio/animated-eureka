//placeholder for student borrow page js
function switchTab(element, tabName) {
    // 1. Get all buttons in this toggle container
    const buttons = element.parentElement.querySelectorAll('.pill-item');
    
    // 2. Remove the 'active' class from all of them
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 3. Add 'active' class to the clicked button
    element.classList.add('active');

    // 4. Handle Content Switching (Optional)
    // We look for divs with the class 'tab-content' and show only the one matching tabName
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        if (content.id === tabName) {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
}